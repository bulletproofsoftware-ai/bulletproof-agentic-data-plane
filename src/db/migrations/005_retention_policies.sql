-- Migration 005: Retention policies (REQ-028)
CREATE TABLE IF NOT EXISTS retention_policies (
  policy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_tier       VARCHAR(20) NOT NULL CHECK (data_tier IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  retention_years INTEGER NOT NULL,
  requires_dual_auth BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(data_tier)
);

-- Seed default retention policies
INSERT INTO retention_policies (data_tier, retention_years, requires_dual_auth) VALUES
  ('PUBLIC', 7, false),
  ('INTERNAL', 7, false),
  ('CONFIDENTIAL', 7, true),
  ('RESTRICTED', 10, true)
ON CONFLICT (data_tier) DO NOTHING;
