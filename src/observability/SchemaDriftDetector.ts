import type pg from 'pg';
import { createLogger } from '../shared/logger.js';
import type { SchemaDriftResult, Schema } from './types.js';

const logger = createLogger('observability:schema-drift');

/**
 * Schema Drift Detector (REQ-033).
 * Compares current schema against stored baseline.
 * Detects: field additions, removals, and type changes.
 */
export class SchemaDriftDetector {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Detect schema drift between current and baseline schema.
   */
  detect(baseline: Schema, current: Schema): SchemaDriftResult {
    const baselineFields = new Map(baseline.fields.map(f => [f.name, f.type]));
    const currentFields = new Map(current.fields.map(f => [f.name, f.type]));

    const added_fields: string[] = [];
    const removed_fields: string[] = [];
    const type_changes: Array<{ field: string; from_type: string; to_type: string }> = [];

    // Check for removed and type-changed fields
    for (const [name, type] of baselineFields) {
      if (!currentFields.has(name)) {
        removed_fields.push(name);
      } else if (currentFields.get(name) !== type) {
        type_changes.push({
          field: name,
          from_type: type,
          to_type: currentFields.get(name)!,
        });
      }
    }

    // Check for added fields
    for (const [name] of currentFields) {
      if (!baselineFields.has(name)) {
        added_fields.push(name);
      }
    }

    const drifted = added_fields.length > 0 || removed_fields.length > 0 || type_changes.length > 0;

    if (drifted) {
      logger.warn('Schema drift detected', {
        added: added_fields.length,
        removed: removed_fields.length,
        typeChanges: type_changes.length,
      });
    }

    return { drifted, added_fields, removed_fields, type_changes };
  }

  /**
   * Store a schema baseline hash for a pipeline.
   */
  async storeBaseline(pipelineId: string, schemaHash: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO pipeline_baselines (pipeline_id, metric_type, field_name, baseline_value, sigma, sample_count)
       VALUES ($1, 'schema', $2, 0, 0, 1)
       ON CONFLICT (pipeline_id, metric_type, field_name)
       DO UPDATE SET baseline_value = 0, updated_at = NOW()`,
      [pipelineId, schemaHash]
    );
  }

  /**
   * Get the stored schema hash for a pipeline.
   */
  async getBaselineHash(pipelineId: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT field_name FROM pipeline_baselines
       WHERE pipeline_id = $1 AND metric_type = 'schema'
       ORDER BY updated_at DESC LIMIT 1`,
      [pipelineId]
    );
    return result.rows[0]?.field_name ?? null;
  }
}
