-- Migration: Add version column to sale_items for optimistic locking
-- This enables proper conflict detection for sale_items in multi-device scenarios

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_sale_items_version ON sale_items(version);

-- Backfill existing records with version 1
UPDATE sale_items SET version = 1 WHERE version IS NULL;
