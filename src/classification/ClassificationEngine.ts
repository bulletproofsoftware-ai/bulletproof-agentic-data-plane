import type pg from 'pg';
import { PIIDetector } from './PIIDetector.js';
import { PHIDetector } from './PHIDetector.js';
import { InsuranceClassifier } from './InsuranceClassifier.js';
import { FinancialDetector } from './FinancialDetector.js';
import { ConfidenceScorer } from './ConfidenceScorer.js';
import { ClassifierVersionManager } from './ClassifierVersionManager.js';
import { EventPublisher, type AgentContext } from '../events/EventPublisher.js';
import { createLogger } from '../shared/logger.js';
import { AuthorizationError } from '../shared/errors.js';
import type { ClassificationResult, ClassificationRecord, ClassificationMatch, ClassificationSummary } from './types.js';
import type { ClassificationDetectedPayload, DataTier } from '../events/types.js';

const logger = createLogger('classification:engine');

/**
 * Continuous Classification Engine (REQ-034/035/036).
 * Hybrid pattern + semantic classification with 4 classifier types.
 * Target: >= 98.5% detection rate, <150ms per record.
 * Classifiers are versioned and hot-reloadable.
 */
export class ClassificationEngine {
  private readonly versionManager = new ClassifierVersionManager();
  private readonly confidenceScorer: ConfidenceScorer;

  constructor(
    private readonly pool: pg.Pool,
    private readonly publisher: EventPublisher,
    minConfidence: number = 0.75
  ) {
    this.confidenceScorer = new ConfidenceScorer(minConfidence);

    // Register default classifiers
    this.versionManager.register(new PIIDetector());
    this.versionManager.register(new PHIDetector());
    this.versionManager.register(new InsuranceClassifier());
    this.versionManager.register(new FinancialDetector());
  }

  /**
   * Classify a single record (all fields).
   * Returns classification results for fields where data was detected.
   * SLA: <150ms per record.
   */
  classifyRecord(
    record: Record<string, unknown>,
    fieldPrefix: string = ''
  ): ClassificationResult[] {
    const results: ClassificationResult[] = [];

    for (const [key, value] of Object.entries(record)) {
      const fieldPath = fieldPrefix ? `${fieldPrefix}.${key}` : key;

      // Skip null/undefined
      if (value === null || value === undefined) continue;

      // If value is a nested object, recurse
      if (typeof value === 'object' && !Array.isArray(value)) {
        results.push(...this.classifyRecord(value as Record<string, unknown>, fieldPath));
        continue;
      }

      // Run all classifiers on this field
      const allMatches: ClassificationMatch[] = [];
      let bestClassifierId = '';
      let bestClassifierVersion = '';

      for (const classifier of this.versionManager.getAll()) {
        const matches = classifier.classify(fieldPath, value, record);
        if (matches.length > 0) {
          allMatches.push(...matches);
          if (!bestClassifierId || matches.some(m => m.confidence > 0.8)) {
            bestClassifierId = classifier.classifierId;
            bestClassifierVersion = classifier.version;
          }
        }
      }

      // Score and produce final classification
      if (allMatches.length > 0) {
        const scored = this.confidenceScorer.score(
          fieldPath,
          allMatches,
          bestClassifierId,
          bestClassifierVersion
        );
        if (scored) {
          results.push(scored);
        }
      }
    }

    return results;
  }

  /**
   * Streaming classification scan.
   * Processes records from an async iterable.
   */
  async *scan(
    dataStream: AsyncIterable<Record<string, unknown>>,
    pipelineId: string,
    datasetId: string,
    agent: AgentContext
  ): AsyncIterable<ClassificationResult> {
    for await (const record of dataStream) {
      const results = this.classifyRecord(record);

      for (const result of results) {
        // Persist to PostgreSQL
        await this.persistResult(result, pipelineId, datasetId);

        // Publish event
        const payload: ClassificationDetectedPayload = {
          field_path: result.field_path,
          detected_tier: result.detected_tier,
          detected_type: result.detected_type,
          sub_type: result.sub_type,
          confidence: result.confidence,
          classifier_id: result.classifier_id,
          classifier_version: result.classifier_version,
          evidence: result.evidence,
          needs_review: result.needs_review,
        };

        await this.publisher.publish({
          eventType: 'data.classification_detected',
          pipelineId,
          agent,
          payload,
          outcome: result.needs_review ? 'warn' : 'info',
        });

        yield result;
      }
    }
  }

  /**
   * Classify a batch of records (non-streaming).
   */
  async classifyBatch(
    records: Record<string, unknown>[],
    pipelineId: string,
    datasetId: string,
    agent: AgentContext
  ): Promise<ClassificationResult[]> {
    const allResults: ClassificationResult[] = [];

    for (const record of records) {
      const results = this.classifyRecord(record);

      for (const result of results) {
        await this.persistResult(result, pipelineId, datasetId);

        const payload: ClassificationDetectedPayload = {
          field_path: result.field_path,
          detected_tier: result.detected_tier,
          detected_type: result.detected_type,
          sub_type: result.sub_type,
          confidence: result.confidence,
          classifier_id: result.classifier_id,
          classifier_version: result.classifier_version,
          evidence: result.evidence,
          needs_review: result.needs_review,
        };

        await this.publisher.publish({
          eventType: 'data.classification_detected',
          pipelineId,
          agent,
          payload,
          outcome: result.needs_review ? 'warn' : 'info',
        });

        allResults.push(result);
      }
    }

    return allResults;
  }

  /**
   * Override a classification decision (REQ-036).
   * Only governance officers can override.
   */
  async override(
    recordId: string,
    newTier: DataTier,
    rationale: string,
    officerId: string
  ): Promise<ClassificationRecord> {
    if (!rationale || rationale.length < 10) {
      throw new AuthorizationError('Override rationale must be at least 10 characters');
    }

    const result = await this.pool.query(
      `UPDATE classification_records
       SET detected_tier = $2, status = 'OVERRIDDEN',
           override_rationale = $3, override_officer = $4
       WHERE record_id = $1
       RETURNING *`,
      [recordId, newTier, rationale, officerId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Classification record not found: ${recordId}`);
    }

    const row = result.rows[0];
    logger.info('Classification overridden', {
      recordId,
      previousTier: row.detected_tier,
      newTier,
      officer: officerId,
    });

    return this.rowToRecord(row);
  }

  /**
   * Get classifications for a pipeline.
   */
  async getByPipeline(pipelineId: string): Promise<ClassificationRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM classification_records
       WHERE pipeline_id = $1
       ORDER BY detected_at DESC`,
      [pipelineId]
    );
    return result.rows.map(r => this.rowToRecord(r));
  }

  /**
   * Get classification summary for a pipeline.
   */
  async getSummary(pipelineId: string): Promise<ClassificationSummary> {
    const result = await this.pool.query(
      `SELECT detected_tier, COUNT(*) AS cnt
       FROM classification_records
       WHERE pipeline_id = $1
       GROUP BY detected_tier`,
      [pipelineId]
    );

    const byTier = { PUBLIC: 0, INTERNAL: 0, CONFIDENTIAL: 0, RESTRICTED: 0 };
    let total = 0;
    for (const row of result.rows) {
      const tier = row.detected_tier as DataTier;
      const count = parseInt(row.cnt, 10);
      byTier[tier] = count;
      total += count;
    }

    const reviewResult = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM classification_records
       WHERE pipeline_id = $1 AND status = 'NEEDS_REVIEW'`,
      [pipelineId]
    );

    return {
      pipeline_id: pipelineId,
      total,
      by_tier: byTier,
      needs_review: parseInt(reviewResult.rows[0]?.cnt ?? '0', 10),
    };
  }

  /**
   * Get pending human reviews.
   */
  async getPendingReviews(limit: number = 50): Promise<ClassificationRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM classification_records
       WHERE status = 'NEEDS_REVIEW'
       ORDER BY detected_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(r => this.rowToRecord(r));
  }

  /**
   * Persist a classification result to PostgreSQL.
   */
  private async persistResult(
    result: ClassificationResult,
    pipelineId: string,
    datasetId: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO classification_records
        (field_path, pipeline_id, dataset_id, detected_tier, detected_type,
         classifier_id, classifier_version, confidence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        result.field_path,
        pipelineId,
        datasetId,
        result.detected_tier,
        result.detected_type,
        result.classifier_id,
        result.classifier_version,
        result.confidence,
        result.status,
      ]
    );
  }

  private rowToRecord(row: Record<string, unknown>): ClassificationRecord {
    return {
      record_id: row.record_id as string,
      field_path: row.field_path as string,
      pipeline_id: row.pipeline_id as string | null,
      dataset_id: row.dataset_id as string | null,
      detected_tier: row.detected_tier as DataTier,
      detected_type: row.detected_type as string,
      confidence: parseFloat(row.confidence as string),
      classifier_id: row.classifier_id as string,
      classifier_version: row.classifier_version as string,
      evidence: [],
      needs_review: row.status === 'NEEDS_REVIEW',
      status: row.status as ClassificationResult['status'],
      override_rationale: row.override_rationale as string | null,
      override_officer: row.override_officer as string | null,
      detected_at: (row.detected_at as Date)?.toISOString?.() ?? String(row.detected_at),
    };
  }

  getVersionManager(): ClassifierVersionManager {
    return this.versionManager;
  }
}
