/**
 * Sync Dead Letter Schema
 *
 * PostgreSQL schema definitions for the sync_dead_letter table.
 */

export const SCHEMA_NAME = "sync_dead_letter" as const;

/**
 * CREATE TABLE statement for sync_dead_letter
 */
export const CREATE_SYNC_DEAD_LETTER_TABLE = `
CREATE TABLE IF NOT EXISTS sync_dead_letter (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL,
  operation_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,
  error TEXT NOT NULL,
  sync_attempts INTEGER NOT NULL,
  original_error TEXT,
  created_at TEXT NOT NULL
);
`.trim();

/**
 * ALTER TABLE statements for backwards compatibility migrations
 */
export const ALTER_SYNC_DEAD_LETTER_TABLE = `
ALTER TABLE sync_dead_letter ADD COLUMN IF NOT EXISTS business_id UUID;
`.trim();

/**
 * Index creation statements for sync_dead_letter
 */
export const CREATE_SYNC_DEAD_LETTER_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_business ON sync_dead_letter(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_operation_id ON sync_dead_letter(operation_id);
`.trim();

/**
 * Full schema setup SQL (all in one)
 */
export const FULL_SCHEMA = [CREATE_SYNC_DEAD_LETTER_TABLE, ALTER_SYNC_DEAD_LETTER_TABLE].join("\n");
