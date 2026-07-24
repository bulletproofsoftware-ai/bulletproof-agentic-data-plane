import { v4 as uuidv4 } from 'uuid';
import type pg from 'pg';
import { createLogger } from '../shared/logger.js';
import type { QualityTrend, TrendPoint, QualityAlert } from './types.js';
import type { TrendDirection } from '../events/types.js';

const logger = createLogger('quality:trend');

/**
 * Quality Trend Tracker (REQ-031).
 * Computes 7-day and 30-day rolling averages.
 * Fires proactive alerts when 30-day trend shows >5% decline.
 */
export class QualityTrendTracker {
  constructor(
    private readonly pool: pg.Pool,
    private readonly alertDeclinePercent: number = 5
  ) {}

  /**
   * Compute quality trend for a dataset.
   */
  async computeTrend(datasetId: string, days: number = 30): Promise<QualityTrend> {
    // Get daily aggregated scores
    const trendResult = await this.pool.query(
      `SELECT
        DATE_TRUNC('day', scored_at)::date AS score_date,
        AVG(total_score)::integer AS avg_score,
        MIN(total_score) AS min_score,
        MAX(total_score) AS max_score
       FROM quality_scores
       WHERE dataset_id = $1 AND scored_at > NOW() - ($2 || ' days')::interval
       GROUP BY DATE_TRUNC('day', scored_at)
       ORDER BY score_date ASC`,
      [datasetId, days.toString()]
    );

    const trend: TrendPoint[] = trendResult.rows.map(row => ({
      date: row.score_date?.toISOString?.().split('T')[0] ?? row.score_date,
      avg_score: parseFloat(row.avg_score),
      min_score: parseInt(row.min_score, 10),
      max_score: parseInt(row.max_score, 10),
    }));

    // Compute rolling averages
    const rolling7d = await this.computeRollingAverage(datasetId, 7);
    const rolling30d = await this.computeRollingAverage(datasetId, 30);

    // Determine trend direction
    const trendDirection = this.determineTrendDirection(trend, rolling7d, rolling30d);

    // Check for alerts
    const alert = await this.checkForAlert(datasetId, rolling7d, rolling30d, trendDirection);

    return {
      dataset_id: datasetId,
      trend,
      rolling_7d_avg: rolling7d,
      rolling_30d_avg: rolling30d,
      trend_direction: trendDirection,
      alert,
    };
  }

  /**
   * Check for proactive quality debt alerts.
   * Fires before blocking threshold is reached.
   */
  async checkAlerts(datasetId: string): Promise<QualityAlert[]> {
    const trend = await this.computeTrend(datasetId);
    const alerts: QualityAlert[] = [];

    if (trend.alert) {
      alerts.push(trend.alert);
    }

    return alerts;
  }

  /**
   * Compute rolling average over N days.
   */
  private async computeRollingAverage(datasetId: string, days: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT AVG(total_score) AS avg_score
       FROM quality_scores
       WHERE dataset_id = $1 AND scored_at > NOW() - ($2 || ' days')::interval`,
      [datasetId, days.toString()]
    );
    return parseFloat(result.rows[0]?.avg_score ?? '0');
  }

  /**
   * Determine trend direction from data points.
   */
  private determineTrendDirection(
    trend: TrendPoint[],
    rolling7d: number,
    rolling30d: number
  ): TrendDirection {
    if (trend.length < 2) return 'STABLE';

    // Compare first half to second half of the trend
    const midpoint = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, midpoint);
    const secondHalf = trend.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.avg_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.avg_score, 0) / secondHalf.length;

    if (firstAvg === 0) return 'STABLE';

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 2) return 'IMPROVING';
    if (changePercent < -2) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Check if a quality alert should be generated.
   * >5% decline over 30 days triggers an alert.
   */
  private async checkForAlert(
    datasetId: string,
    rolling7d: number,
    rolling30d: number,
    direction: TrendDirection
  ): Promise<QualityAlert | null> {
    if (direction !== 'DECLINING') return null;
    if (rolling30d === 0) return null;

    // Compare current 7d average against 30d average
    const declinePercent = ((rolling30d - rolling7d) / rolling30d) * 100;

    if (declinePercent > this.alertDeclinePercent) {
      // Get latest threshold
      const result = await this.pool.query(
        `SELECT blocking_threshold FROM quality_scores
         WHERE dataset_id = $1 ORDER BY scored_at DESC LIMIT 1`,
        [datasetId]
      );
      const threshold = result.rows[0]?.blocking_threshold ?? 700;

      const alert: QualityAlert = {
        alert_id: uuidv4(),
        dataset_id: datasetId,
        pipeline_id: null,
        alert_type: 'QUALITY_DECLINE',
        message: `Quality declining: 7-day avg (${Math.round(rolling7d)}) is ${declinePercent.toFixed(1)}% below 30-day avg (${Math.round(rolling30d)})`,
        current_score: Math.round(rolling7d),
        threshold,
        created_at: new Date().toISOString(),
      };

      logger.warn('Quality decline alert generated', {
        datasetId,
        declinePercent: declinePercent.toFixed(1),
        rolling7d: Math.round(rolling7d),
        rolling30d: Math.round(rolling30d),
      });

      return alert;
    }

    return null;
  }

  /**
   * Refresh the quality_trends materialized view.
   */
  async refreshTrends(): Promise<void> {
    await this.pool.query('REFRESH MATERIALIZED VIEW quality_trends');
    logger.info('Quality trends materialized view refreshed');
  }
}
