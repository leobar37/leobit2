/**
 * Sync Operations Schema
 *
 * PostgreSQL schema definitions for the sync_operations table.
 */

export const SCHEMA_NAME = "sync_operations" as const;

/**
 * CREATE TABLE statement for sync_operations
 */
export const CREATE_SYNC_OPERATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

/**
 * ALTER TABLE statements for backwards compatibility migrations
 */
export const ALTER_SYNC_OPERATIONS_TABLE = `
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
`.trim();

/**
 * Index creation statements for sync_operations
 */
export const CREATE_SYNC_OPERATIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sync_operations_business ON sync_operations(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(business_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations(created_at);
`.trim();

/**
 * Full schema setup SQL (all in one)
 */
export const FULL_SCHEMA = [CREATE_SYNC_OPERATIONS_TABLE, ALTER_SYNC_OPERATIONS_TABLE].join("\n");
