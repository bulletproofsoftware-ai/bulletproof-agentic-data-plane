-- Migration 008: Materialized view for quality trends (REQ-031)
-- Drop first to allow re-creation on schema changes
DROP MATERIALIZED VIEW IF EXISTS quality_trends;

CREATE MATERIALIZED VIEW quality_trends AS
  SELECT
    dataset_id,
    pipeline_id,
    DATE_TRUNC('day', scored_at) AS score_date,
    AVG(total_score) AS avg_score,
    MIN(total_score) AS min_score,
    MAX(total_score) AS max_score,
    COUNT(*) AS score_count
  FROM quality_scores
  WHERE scored_at > NOW() - INTERVAL '90 days'
  GROUP BY dataset_id, pipeline_id, DATE_TRUNC('day', scored_at);

CREATE INDEX IF NOT EXISTS idx_quality_trends_dataset ON quality_trends(dataset_id, score_date DESC);
