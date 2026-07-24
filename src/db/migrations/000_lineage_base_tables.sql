-- Migration 000: Base lineage tables
-- These tables may already exist if the conductor-data-pipeline has run.
-- Using IF NOT EXISTS to be safe.

CREATE TABLE IF NOT EXISTS lineage_nodes (
  node_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation       VARCHAR(50) NOT NULL,
  agent_id        VARCHAR(200) NOT NULL,
  session_id      VARCHAR(200) NOT NULL,
  inputs          UUID[],
  outputs         UUID[],
  transform_fn    TEXT,
  schema_hash     VARCHAR(64),
  tier            VARCHAR(20) CHECK (tier IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lineage_nodes_operation ON lineage_nodes(operation);
CREATE INDEX IF NOT EXISTS idx_lineage_nodes_agent ON lineage_nodes(agent_id);
CREATE INDEX IF NOT EXISTS idx_lineage_nodes_created ON lineage_nodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_nodes_metadata_pipeline ON lineage_nodes USING gin (metadata jsonb_path_ops);

CREATE TABLE IF NOT EXISTS lineage_edges (
  from_node       UUID NOT NULL REFERENCES lineage_nodes(node_id) ON DELETE CASCADE,
  to_node         UUID NOT NULL REFERENCES lineage_nodes(node_id) ON DELETE CASCADE,
  field_map       JSONB,
  transform_applied TEXT,
  PRIMARY KEY (from_node, to_node)
);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_to ON lineage_edges(to_node);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_from ON lineage_edges(from_node);
