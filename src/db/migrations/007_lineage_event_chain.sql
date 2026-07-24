-- Migration 007: Lineage event hash chain for tamper evidence (REQ-024)
CREATE TABLE IF NOT EXISTS lineage_event_chain (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      VARCHAR(30) NOT NULL CHECK (event_type IN (
    'LINEAGE_SOURCE','LINEAGE_TRANSFORM','LINEAGE_MERGE','LINEAGE_OUTPUT',
    'LINEAGE_DELETE','CLASSIFICATION_DETECTED','QUALITY_SCORED','PIPELINE_ANOMALY'
  )),
  pipeline_id     VARCHAR(200),
  agent_id        VARCHAR(200) NOT NULL,
  session_id      VARCHAR(200) NOT NULL,
  payload         JSONB NOT NULL,
  content_hash    VARCHAR(64) NOT NULL,
  previous_hash   VARCHAR(64) NOT NULL,
  hmac_signature  VARCHAR(64) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_chain_pipeline ON lineage_event_chain(pipeline_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_chain_type ON lineage_event_chain(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_event_chain_agent ON lineage_event_chain(agent_id);
