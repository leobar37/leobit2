-- Create sync_conflicts table for conflict resolution
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operation_id VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  local_version INTEGER NOT NULL,
  server_version INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  resolution VARCHAR(32),
  resolved_by UUID REFERENCES business_users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_business_id ON sync_conflicts(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created_at ON sync_conflicts(created_at);

-- Create unique constraint for operation per business
CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_conflicts_operation ON sync_conflicts(business_id, operation_id);