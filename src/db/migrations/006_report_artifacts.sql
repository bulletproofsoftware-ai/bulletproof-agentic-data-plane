-- Migration 006: Report artifacts (REQ-039)
CREATE TABLE IF NOT EXISTS report_artifacts (
  report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type     VARCHAR(50) NOT NULL CHECK (report_type IN ('DOI','HIPAA','RATE_FILING')),
  pipeline_id     VARCHAR(200),
  policy_id       VARCHAR(200),
  format          VARCHAR(10) NOT NULL CHECK (format IN ('PDF','JSON')),
  file_path       TEXT NOT NULL,
  file_hash       VARCHAR(64) NOT NULL,
  generated_by    VARCHAR(200) NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_type ON report_artifacts(report_type, generated_at DESC);
