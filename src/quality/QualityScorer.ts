import type { QualityDimensions, DatasetMetrics } from './types.js';

/**
 * Quality dimension calculator (REQ-029).
 * Computes individual dimension scores (0-250 each) from dataset metrics.
 *
 * Scoring formula:
 *   Completeness = (non_null_required / total_required) * 250
 *   Accuracy = (validated_values / total_values) * 250
 *   Consistency = (schema_conforming / total_records) * 250
 *   Timeliness = max(0, 250 * (1 - data_age_hours / sla_hours))
 */
export class QualityScorer {
  /**
   * Compute completeness score: ratio of non-null required fields.
   */
  computeCompleteness(metrics: DatasetMetrics): number {
    if (metrics.total_required_fields === 0) return 250;
    const ratio = metrics.non_null_required_fields / metrics.total_required_fields;
    return Math.round(Math.min(1, Math.max(0, ratio)) * 250);
  }

  /**
   * Compute accuracy score: ratio of validated values.
   */
  computeAccuracy(metrics: DatasetMetrics): number {
    if (metrics.total_values === 0) return 250;
    const ratio = metrics.validated_values / metrics.total_values;
    return Math.round(Math.min(1, Math.max(0, ratio)) * 250);
  }

  /**
   * Compute consistency score: ratio of schema-conforming records.
   */
  computeConsistency(metrics: DatasetMetrics): number {
    if (metrics.total_records === 0) return 250;
    const ratio = metrics.schema_conforming_records / metrics.total_records;
    return Math.round(Math.min(1, Math.max(0, ratio)) * 250);
  }

  /**
   * Compute timeliness score: decays linearly with age relative to SLA.
   */
  computeTimeliness(metrics: DatasetMetrics): number {
    if (metrics.sla_hours <= 0) return 250;
    const ratio = 1 - (metrics.data_age_hours / metrics.sla_hours);
    return Math.round(Math.min(1, Math.max(0, ratio)) * 250);
  }

  /**
   * Compute all dimensions and total score.
   */
  score(metrics: DatasetMetrics): { dimensions: QualityDimensions; total: number } {
    const dimensions: QualityDimensions = {
      completeness: this.computeCompleteness(metrics),
      accuracy: this.computeAccuracy(metrics),
      consistency: this.computeConsistency(metrics),
      timeliness: this.computeTimeliness(metrics),
    };

    const total = dimensions.completeness + dimensions.accuracy +
                  dimensions.consistency + dimensions.timeliness;

    return { dimensions, total };
  }
}
