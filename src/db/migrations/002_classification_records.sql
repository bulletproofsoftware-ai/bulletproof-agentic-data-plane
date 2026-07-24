-- Migration 002: Classification records (REQ-034/035/036)
CREATE TABLE IF NOT EXISTS classification_records (
  record_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_path        TEXT NOT NULL,
  pipeline_id       VARCHAR(200),
  dataset_id        VARCHAR(200),
  detected_tier     VARCHAR(20) NOT NULL CHECK (detected_tier IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  detected_type     VARCHAR(100),
  classifier_id     VARCHAR(100) NOT NULL,
  classifier_version VARCHAR(20) NOT NULL,
  confidence        NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status            VARCHAR(20) DEFAULT 'AUTO' CHECK (status IN ('AUTO','NEEDS_REVIEW','OVERRIDDEN','CONFIRMED')),
  override_rationale TEXT,
  override_officer   VARCHAR(100),
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classification_pipeline ON classification_records(pipeline_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_classification_needs_review ON classification_records(status) WHERE status = 'NEEDS_REVIEW';
CREATE INDEX IF NOT EXISTS idx_classification_tier ON classification_records(detected_tier);
