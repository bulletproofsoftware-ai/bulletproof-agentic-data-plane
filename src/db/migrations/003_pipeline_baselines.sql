-- Migration 003: Pipeline baselines for anomaly detection (REQ-032)
CREATE TABLE IF NOT EXISTS pipeline_baselines (
  baseline_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     VARCHAR(200) NOT NULL,
  metric_type     VARCHAR(50) NOT NULL CHECK (metric_type IN ('volume','null_rate','schema','sla')),
  field_name      VARCHAR(200),
  baseline_value  DOUBLE PRECISION NOT NULL,
  sigma           DOUBLE PRECISION NOT NULL,
  sample_count    INTEGER NOT NULL DEFAULT 0,
  window_days     INTEGER NOT NULL DEFAULT 30,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pipeline_id, metric_type, field_name)
);
