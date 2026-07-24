import type { AnomalyType, Severity } from '../events/types.js';

export interface PipelineAlert {
  anomaly_id: string;
  pipeline_id: string;
  anomaly_type: AnomalyType;
  severity: Severity;
  expected_value: number | string;
  actual_value: number | string;
  affected_fields: string[];
  affected_consumers: string[];
  detected_at: string;
}

export interface PipelineBaseline {
  baseline_id: string;
  pipeline_id: string;
  metric_type: 'volume' | 'null_rate' | 'schema' | 'sla';
  field_name: string | null;
  baseline_value: number;
  sigma: number;
  sample_count: number;
  window_days: number;
}

export interface PipelineHealth {
  pipeline_id: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  anomalies: PipelineAlert[];
  last_run: string | null;
  baselines: {
    volume?: { expected: number; sigma: number };
    null_rate?: { avg: number };
    sla_ms?: { max: number };
  };
}

export interface DataBatch {
  pipeline_id: string;
  record_count: number;
  null_counts: Record<string, number>;
  total_fields: number;
  schema_hash: string;
  processing_time_ms: number;
  timestamp: string;
}

export interface SchemaDriftResult {
  drifted: boolean;
  added_fields: string[];
  removed_fields: string[];
  type_changes: Array<{ field: string; from_type: string; to_type: string }>;
}

export interface Schema {
  fields: Array<{ name: string; type: string }>;
  hash: string;
}

export interface NotificationResult {
  consumer_id: string;
  delivered: boolean;
  attempts: number;
  error?: string;
}

export interface ConsumerSubscription {
  subscription_id: string;
  pipeline_id: string;
  consumer_id: string;
  consumer_name: string;
  webhook_url: string;
  ack_timeout_minutes: number;
  active: boolean;
}
