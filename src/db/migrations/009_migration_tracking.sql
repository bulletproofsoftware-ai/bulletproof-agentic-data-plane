-- Migration 009: Migration tracking table
CREATE TABLE IF NOT EXISTS _data_plane_migrations (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL UNIQUE,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
