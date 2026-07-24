import type { TrendDirection } from '../events/types.js';

export interface QualityDimensions {
  completeness: number;  // 0-250
  accuracy: number;      // 0-250
  consistency: number;   // 0-250
  timeliness: number;    // 0-250
}

export interface QualityScore {
  score_id: string;
  dataset_id: string;
  pipeline_id: string | null;
  total_score: number;       // 0-1000
  dimensions: QualityDimensions;
  blocking_threshold: number;
  blocked: boolean;
  failing_checks: string[];
  scored_at: string;
}

export interface QualityConfig {
  blocking_threshold: number;
  dimension_weights: QualityDimensions;
  sla_hours: Record<string, number>;
}

export interface DatasetMetrics {
  dataset_id: string;
  pipeline_id?: string;
  total_records: number;
  total_required_fields: number;
  non_null_required_fields: number;
  validated_values: number;
  total_values: number;
  schema_conforming_records: number;
  data_age_hours: number;
  sla_hours: number;
  failing_checks: string[];
}

export interface EnforcementResult {
  blocked: boolean;
  score: number;
  threshold: number;
  reason: string | null;
}

export interface QualityTrend {
  dataset_id: string;
  trend: TrendPoint[];
  rolling_7d_avg: number;
  rolling_30d_avg: number;
  trend_direction: TrendDirection;
  alert: QualityAlert | null;
}

export interface TrendPoint {
  date: string;
  avg_score: number;
  min_score: number;
  max_score: number;
}

export interface QualityAlert {
  alert_id: string;
  dataset_id: string;
  pipeline_id: string | null;
  alert_type: string;
  message: string;
  current_score: number;
  threshold: number;
  created_at: string;
}
