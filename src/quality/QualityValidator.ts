import type pg from 'pg';
import { QualityScorer } from './QualityScorer.js';
import { EventPublisher, type AgentContext } from '../events/EventPublisher.js';
import { createLogger } from '../shared/logger.js';
import type {
  QualityScore,
  QualityConfig,
  DatasetMetrics,
  EnforcementResult,
} from './types.js';
import type { QualityScoredPayload } from '../events/types.js';

const logger = createLogger('quality:validator');

const DEFAULT_CONFIG: QualityConfig = {
  blocking_threshold: 700,
  dimension_weights: {
    completeness: 250,
    accuracy: 250,
    consistency: 250,
    timeliness: 250,
  },
  sla_hours: {},
};

/**
 * Quality Validation Pipeline (REQ-029/030).
 * Scores datasets across 4 dimensions (0-1000 total).
 * Blocks production promotion below configurable threshold.
 */
export class QualityValidator {
  private readonly scorer = new QualityScorer();

  constructor(
    private readonly pool: pg.Pool,
    private readonly publisher: EventPublisher
  ) {}

  /**
   * Score a dataset across 4 dimensions (REQ-029).
   * Persists the score to PostgreSQL and publishes to audit bus.
   */
  async score(
    metrics: DatasetMetrics,
    agent: AgentContext,
    config: Partial<QualityConfig> = {}
  ): Promise<QualityScore> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const { dimensions, total } = this.scorer.score(metrics);

    const blocked = total < fullConfig.blocking_threshold;

    // Persist score to PostgreSQL
    const result = await this.pool.query(
      `INSERT INTO quality_scores
        (dataset_id, pipeline_id, total_score, completeness, accuracy,
         consistency, timeliness, blocking_threshold, blocked, failing_checks, scored_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING score_id, scored_at`,
      [
        metrics.dataset_id,
        metrics.pipeline_id ?? null,
        total,
        dimensions.completeness,
        dimensions.accuracy,
        dimensions.consistency,
        dimensions.timeliness,
        fullConfig.blocking_threshold,
        blocked,
        JSON.stringify(metrics.failing_checks),
      ]
    );

    const scoreId = result.rows[0].score_id;
    const scoredAt = result.rows[0].scored_at;

    // Determine trend direction (compare with previous scores)
    const trendDirection = await this.computeTrendDirection(metrics.dataset_id, total);

    // Publish QUALITY_SCORED event
    const payload: QualityScoredPayload = {
      dataset_id: metrics.dataset_id,
      total_score: total,
      dimensions,
      blocking_threshold: fullConfig.blocking_threshold,
      blocked,
      failing_checks: metrics.failing_checks,
      trend_direction: trendDirection,
    };

    await this.publisher.publish({
      eventType: 'data.quality_scored',
      pipelineId: metrics.pipeline_id ?? 'unknown',
      agent,
      payload,
      outcome: blocked ? 'deny' : 'allow',
    });

    logger.info('Quality score computed', {
      datasetId: metrics.dataset_id,
      total,
      blocked,
    });

    return {
      score_id: scoreId,
      dataset_id: metrics.dataset_id,
      pipeline_id: metrics.pipeline_id ?? null,
      total_score: total,
      dimensions,
      blocking_threshold: fullConfig.blocking_threshold,
      blocked,
      failing_checks: metrics.failing_checks,
      scored_at: scoredAt?.toISOString?.() ?? scoredAt,
    };
  }

  /**
   * Enforce quality gate (REQ-030).
   * Returns enforcement result; throws QualityGateError if blocking is active.
   */
  async enforce(
    datasetId: string,
    threshold?: number
  ): Promise<EnforcementResult> {
    const effectiveThreshold = threshold ?? DEFAULT_CONFIG.blocking_threshold;

    const result = await this.pool.query(
      `SELECT total_score, blocked FROM quality_scores
       WHERE dataset_id = $1
       ORDER BY scored_at DESC LIMIT 1`,
      [datasetId]
    );

    if (result.rows.length === 0) {
      return {
        blocked: true,
        score: 0,
        threshold: effectiveThreshold,
        reason: 'No quality score available for dataset',
      };
    }

    const { total_score, blocked } = result.rows[0];

    if (blocked || total_score < effectiveThreshold) {
      return {
        blocked: true,
        score: total_score,
        threshold: effectiveThreshold,
        reason: `Score ${total_score} is below threshold ${effectiveThreshold}`,
      };
    }

    return {
      blocked: false,
      score: total_score,
      threshold: effectiveThreshold,
      reason: null,
    };
  }

  /**
   * Get latest quality score for a dataset.
   */
  async getLatestScore(datasetId: string): Promise<QualityScore | null> {
    const result = await this.pool.query(
      `SELECT score_id, dataset_id, pipeline_id, total_score,
              completeness, accuracy, consistency, timeliness,
              blocking_threshold, blocked, failing_checks, scored_at
       FROM quality_scores
       WHERE dataset_id = $1
       ORDER BY scored_at DESC LIMIT 1`,
      [datasetId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      score_id: row.score_id,
      dataset_id: row.dataset_id,
      pipeline_id: row.pipeline_id,
      total_score: row.total_score,
      dimensions: {
        completeness: row.completeness,
        accuracy: row.accuracy,
        consistency: row.consistency,
        timeliness: row.timeliness,
      },
      blocking_threshold: row.blocking_threshold,
      blocked: row.blocked,
      failing_checks: row.failing_checks ?? [],
      scored_at: row.scored_at?.toISOString?.() ?? row.scored_at,
    };
  }

  /**
   * Compute trend direction by comparing current score with recent average.
   */
  private async computeTrendDirection(
    datasetId: string,
    currentScore: number
  ): Promise<'improving' | 'stable' | 'declining'> {
    const result = await this.pool.query(
      `SELECT AVG(total_score) AS avg_score
       FROM quality_scores
       WHERE dataset_id = $1 AND scored_at > NOW() - INTERVAL '7 days'`,
      [datasetId]
    );

    const recentAvg = parseFloat(result.rows[0]?.avg_score ?? '0');
    if (recentAvg === 0) return 'stable';

    const changePercent = ((currentScore - recentAvg) / recentAvg) * 100;

    if (changePercent > 2) return 'improving';
    if (changePercent < -2) return 'declining';
    return 'stable';
  }
}
