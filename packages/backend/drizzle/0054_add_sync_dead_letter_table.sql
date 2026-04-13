-- Dead Letter Queue table for permanently failed sync operations
-- Tracks operations that exceeded retry limits for admin review

CREATE TABLE IF NOT EXISTS sync_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operation_id VARCHAR(128) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  original_error TEXT,
  client_timestamp TIMESTAMP NOT NULL,
  device_id VARCHAR(128),
  source_fingerprint VARCHAR(256),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_business_id ON sync_dead_letter(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_entity ON sync_dead_letter(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_created_at ON sync_dead_letter(created_at);
