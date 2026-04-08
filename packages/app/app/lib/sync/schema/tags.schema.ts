/**
 * Tags Schema
 */

export const SCHEMA_NAME = "tags";

export const CREATE_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#f97316',
  business_id UUID NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_TAGS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_tags_business_id ON tags(business_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);
`.trim();
