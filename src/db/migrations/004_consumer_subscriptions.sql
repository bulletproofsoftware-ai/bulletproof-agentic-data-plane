-- Migration 004: Consumer subscriptions for schema drift notifications (REQ-033)
CREATE TABLE IF NOT EXISTS consumer_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     VARCHAR(200) NOT NULL,
  consumer_id     VARCHAR(200) NOT NULL,
  consumer_name   VARCHAR(200) NOT NULL,
  webhook_url     TEXT NOT NULL,
  ack_timeout_minutes INTEGER NOT NULL DEFAULT 60,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pipeline_id, consumer_id)
);
