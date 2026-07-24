-- Migration 001: Quality scores with trend tracking (REQ-029/031)
CREATE TABLE IF NOT EXISTS quality_scores (
  score_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id      VARCHAR(200) NOT NULL,
  pipeline_id     VARCHAR(200),
  total_score     SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 1000),
  completeness    SMALLINT CHECK (completeness BETWEEN 0 AND 250),
  accuracy        SMALLINT CHECK (accuracy BETWEEN 0 AND 250),
  consistency     SMALLINT CHECK (consistency BETWEEN 0 AND 250),
  timeliness      SMALLINT CHECK (timeliness BETWEEN 0 AND 250),
  blocking_threshold SMALLINT NOT NULL DEFAULT 700,
  blocked         BOOLEAN NOT NULL DEFAULT false,
  failing_checks  JSONB,
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_dataset_trend ON quality_scores(dataset_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_pipeline ON quality_scores(pipeline_id, scored_at DESC);
