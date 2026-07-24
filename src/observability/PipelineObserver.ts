import { v4 as uuidv4 } from 'uuid';
import type pg from 'pg';
import { SchemaDriftDetector } from './SchemaDriftDetector.js';
import { ConsumerNotifier } from './ConsumerNotifier.js';
import { EventPublisher, type AgentContext } from '../events/EventPublisher.js';
import { createLogger } from '../shared/logger.js';
import type { PipelineAlert, DataBatch, PipelineHealth, PipelineBaseline, Schema } from './types.js';
import type { PipelineAnomalyPayload, AnomalyType, Severity } from '../events/types.js';

const logger = createLogger('observability:observer');

/**
 * Pipeline Observer (REQ-032/033).
 * Detects 4 anomaly classes: schema drift, volume anomaly, null rate spikes, SLA breaches.
 * Alerts reach subscribers within 30 seconds.
 */
export class PipelineObserver {
  private readonly schemaDriftDetector: SchemaDriftDetector;
  private readonly consumerNotifier: ConsumerNotifier;

  constructor(
    private readonly pool: pg.Pool,
    private readonly publisher: EventPublisher,
    private readonly anomalySigmaThreshold: number = 2.0,
    private readonly nullRateSpikeThreshold: number = 0.10
  ) {
    this.schemaDriftDetector = new SchemaDriftDetector(pool);
    this.consumerNotifier = new ConsumerNotifier(pool);
  }

  /**
   * Register a pipeline and compute initial baselines.
   */
  async register(pipelineId: string, initialBatch: DataBatch): Promise<void> {
    // Store volume baseline
    await this.upsertBaseline(pipelineId, 'volume', null, initialBatch.record_count, 0, 1);

    // Store null rate baselines per field
    for (const [field, nullCount] of Object.entries(initialBatch.null_counts)) {
      const nullRate = initialBatch.record_count > 0 ? nullCount / initialBatch.record_count : 0;
      await this.upsertBaseline(pipelineId, 'null_rate', field, nullRate, 0, 1);
    }

    // Store schema baseline
    await this.schemaDriftDetector.storeBaseline(pipelineId, initialBatch.schema_hash);

    // Store SLA baseline
    await this.upsertBaseline(pipelineId, 'sla', null, initialBatch.processing_time_ms, 0, 1);

    logger.info('Pipeline registered', { pipelineId });
  }

  /**
   * Observe a pipeline batch for anomalies.
   * Checks all 4 anomaly classes. Publishes PIPELINE_ANOMALY events.
   */
  async observe(
    pipelineId: string,
    batch: DataBatch,
    agent: AgentContext,
    currentSchema?: Schema,
    baselineSchema?: Schema
  ): Promise<PipelineAlert[]> {
    const alerts: PipelineAlert[] = [];

    // 1. Volume anomaly (>2 sigma deviation)
    const volumeAlert = await this.checkVolumeAnomaly(pipelineId, batch.record_count);
    if (volumeAlert) alerts.push(volumeAlert);

    // 2. Null rate spikes (>10% increase)
    const nullAlerts = await this.checkNullRateSpikes(pipelineId, batch);
    alerts.push(...nullAlerts);

    // 3. Schema drift
    if (currentSchema && baselineSchema) {
      const drift = this.schemaDriftDetector.detect(baselineSchema, currentSchema);
      if (drift.drifted) {
        const schemaAlert = this.createAlert(pipelineId, 'SCHEMA_DRIFT', 'HIGH',
          baselineSchema.hash, currentSchema.hash,
          [...drift.added_fields, ...drift.removed_fields, ...drift.type_changes.map(t => t.field)]
        );
        alerts.push(schemaAlert);
      }
    }

    // 4. SLA breach
    const slaAlert = await this.checkSlaBreach(pipelineId, batch.processing_time_ms);
    if (slaAlert) alerts.push(slaAlert);

    // Publish events and notify consumers for each alert
    const consumers = await this.consumerNotifier.getConsumers(pipelineId);
    const consumerIds = consumers.map(c => c.consumer_id);

    for (const alert of alerts) {
      alert.affected_consumers = consumerIds;

      const payload: PipelineAnomalyPayload = {
        anomaly_type: alert.anomaly_type.toLowerCase(),
        severity: alert.severity.toLowerCase(),
        expected_value: alert.expected_value,
        actual_value: alert.actual_value,
        affected_fields: alert.affected_fields,
        affected_consumers: consumerIds,
        notification_sent: consumers.length > 0,
        details: { pipeline_id: pipelineId },
      };

      await this.publisher.publish({
        eventType: 'data.pipeline_anomaly',
        pipelineId,
        agent,
        payload,
        outcome: 'warn',
      });

      // Notify consumers
      if (consumers.length > 0) {
        await this.consumerNotifier.notify(pipelineId, alert);
      }
    }

    // Update baselines with this batch data
    await this.updateBaselines(pipelineId, batch);

    return alerts;
  }

  /**
   * Get pipeline health status.
   */
  async getHealth(pipelineId: string): Promise<PipelineHealth> {
    // Get baselines
    const baselines = await this.getBaselines(pipelineId);

    // Get recent anomalies from event chain
    const anomalyResult = await this.pool.query(
      `SELECT event_id, payload, created_at
       FROM lineage_event_chain
       WHERE pipeline_id = $1 AND event_type = 'PIPELINE_ANOMALY'
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 10`,
      [pipelineId]
    );

    const anomalies: PipelineAlert[] = anomalyResult.rows.map(row => {
      const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      return {
        anomaly_id: row.event_id,
        pipeline_id: pipelineId,
        anomaly_type: (p.anomaly_type ?? 'UNKNOWN').toUpperCase() as AnomalyType,
        severity: (p.severity ?? 'LOW').toUpperCase() as Severity,
        expected_value: p.expected_value ?? 0,
        actual_value: p.actual_value ?? 0,
        affected_fields: p.affected_fields ?? [],
        affected_consumers: p.affected_consumers ?? [],
        detected_at: row.created_at?.toISOString?.() ?? row.created_at,
      };
    });

    const status = anomalies.length === 0 ? 'HEALTHY' :
                   anomalies.some(a => a.severity === 'CRITICAL') ? 'UNHEALTHY' : 'DEGRADED';

    const volumeBaseline = baselines.find(b => b.metric_type === 'volume' && !b.field_name);
    const nullRateBaseline = baselines.find(b => b.metric_type === 'null_rate' && !b.field_name);
    const slaBaseline = baselines.find(b => b.metric_type === 'sla' && !b.field_name);

    return {
      pipeline_id: pipelineId,
      status,
      anomalies,
      last_run: anomalyResult.rows[0]?.created_at?.toISOString?.() ?? null,
      baselines: {
        volume: volumeBaseline ? { expected: volumeBaseline.baseline_value, sigma: volumeBaseline.sigma } : undefined,
        null_rate: nullRateBaseline ? { avg: nullRateBaseline.baseline_value } : undefined,
        sla_ms: slaBaseline ? { max: slaBaseline.baseline_value } : undefined,
      },
    };
  }

  /**
   * Check for volume anomaly (>2 sigma from baseline).
   */
  private async checkVolumeAnomaly(pipelineId: string, currentVolume: number): Promise<PipelineAlert | null> {
    const baseline = await this.getBaselineMetric(pipelineId, 'volume', null);
    if (!baseline || baseline.sample_count < 3) return null;

    const deviation = Math.abs(currentVolume - baseline.baseline_value);
    if (baseline.sigma > 0 && deviation > this.anomalySigmaThreshold * baseline.sigma) {
      return this.createAlert(pipelineId, 'VOLUME_ANOMALY',
        deviation > 3 * baseline.sigma ? 'CRITICAL' : 'HIGH',
        baseline.baseline_value, currentVolume, []);
    }
    return null;
  }

  /**
   * Check for null rate spikes (>10% increase from baseline).
   */
  private async checkNullRateSpikes(pipelineId: string, batch: DataBatch): Promise<PipelineAlert[]> {
    const alerts: PipelineAlert[] = [];
    for (const [field, nullCount] of Object.entries(batch.null_counts)) {
      if (batch.record_count === 0) continue;
      const currentRate = nullCount / batch.record_count;

      const baseline = await this.getBaselineMetric(pipelineId, 'null_rate', field);
      if (!baseline || baseline.sample_count < 3) continue;

      const increase = currentRate - baseline.baseline_value;
      if (increase > this.nullRateSpikeThreshold) {
        alerts.push(this.createAlert(pipelineId, 'NULL_RATE_SPIKE', 'HIGH',
          baseline.baseline_value, currentRate, [field]));
      }
    }
    return alerts;
  }

  /**
   * Check for SLA breach.
   */
  private async checkSlaBreach(pipelineId: string, processingTimeMs: number): Promise<PipelineAlert | null> {
    const baseline = await this.getBaselineMetric(pipelineId, 'sla', null);
    if (!baseline || baseline.sample_count < 3) return null;

    // SLA breach if processing time exceeds 2x the baseline
    if (processingTimeMs > baseline.baseline_value * 2) {
      return this.createAlert(pipelineId, 'SLA_BREACH',
        processingTimeMs > baseline.baseline_value * 5 ? 'CRITICAL' : 'HIGH',
        baseline.baseline_value, processingTimeMs, []);
    }
    return null;
  }

  /**
   * Update baselines using Welford's online algorithm for running mean and variance.
   */
  private async updateBaselines(pipelineId: string, batch: DataBatch): Promise<void> {
    // Update volume baseline
    await this.updateBaselineWithWelford(pipelineId, 'volume', null, batch.record_count);

    // Update null rate baselines
    for (const [field, nullCount] of Object.entries(batch.null_counts)) {
      const rate = batch.record_count > 0 ? nullCount / batch.record_count : 0;
      await this.updateBaselineWithWelford(pipelineId, 'null_rate', field, rate);
    }

    // Update SLA baseline
    await this.updateBaselineWithWelford(pipelineId, 'sla', null, batch.processing_time_ms);
  }

  /**
   * Welford's online algorithm for updating mean and standard deviation.
   */
  private async updateBaselineWithWelford(
    pipelineId: string,
    metricType: string,
    fieldName: string | null,
    newValue: number
  ): Promise<void> {
    const baseline = await this.getBaselineMetric(pipelineId, metricType, fieldName);

    if (!baseline) {
      await this.upsertBaseline(pipelineId, metricType, fieldName, newValue, 0, 1);
      return;
    }

    const n = baseline.sample_count + 1;
    const oldMean = baseline.baseline_value;
    const newMean = oldMean + (newValue - oldMean) / n;

    // Approximate sigma update (simplified Welford's)
    const oldVariance = baseline.sigma * baseline.sigma;
    const newVariance = oldVariance + ((newValue - oldMean) * (newValue - newMean) - oldVariance) / n;
    const newSigma = Math.sqrt(Math.max(0, newVariance));

    await this.upsertBaseline(pipelineId, metricType, fieldName, newMean, newSigma, n);
  }

  private async getBaselineMetric(
    pipelineId: string,
    metricType: string,
    fieldName: string | null
  ): Promise<PipelineBaseline | null> {
    const result = await this.pool.query(
      `SELECT baseline_id, pipeline_id, metric_type, field_name,
              baseline_value, sigma, sample_count, window_days
       FROM pipeline_baselines
       WHERE pipeline_id = $1 AND metric_type = $2
         AND (field_name = $3 OR ($3 IS NULL AND field_name IS NULL))`,
      [pipelineId, metricType, fieldName]
    );
    return result.rows[0] ?? null;
  }

  private async getBaselines(pipelineId: string): Promise<PipelineBaseline[]> {
    const result = await this.pool.query(
      `SELECT baseline_id, pipeline_id, metric_type, field_name,
              baseline_value, sigma, sample_count, window_days
       FROM pipeline_baselines
       WHERE pipeline_id = $1`,
      [pipelineId]
    );
    return result.rows;
  }

  private async upsertBaseline(
    pipelineId: string,
    metricType: string,
    fieldName: string | null,
    value: number,
    sigma: number,
    sampleCount: number
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO pipeline_baselines (pipeline_id, metric_type, field_name, baseline_value, sigma, sample_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (pipeline_id, metric_type, field_name)
       DO UPDATE SET baseline_value = $4, sigma = $5, sample_count = $6, updated_at = NOW()`,
      [pipelineId, metricType, fieldName, value, sigma, sampleCount]
    );
  }

  private createAlert(
    pipelineId: string,
    anomalyType: AnomalyType,
    severity: Severity,
    expected: number | string,
    actual: number | string,
    affectedFields: string[]
  ): PipelineAlert {
    return {
      anomaly_id: uuidv4(),
      pipeline_id: pipelineId,
      anomaly_type: anomalyType,
      severity,
      expected_value: expected,
      actual_value: actual,
      affected_fields: affectedFields,
      affected_consumers: [],
      detected_at: new Date().toISOString(),
    };
  }

  getConsumerNotifier(): ConsumerNotifier {
    return this.consumerNotifier;
  }

  getSchemaDriftDetector(): SchemaDriftDetector {
    return this.schemaDriftDetector;
  }
}
