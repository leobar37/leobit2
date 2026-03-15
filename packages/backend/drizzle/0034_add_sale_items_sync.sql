-- Add sync_status and sync_attempts columns to sale_items
-- This enables offline-first sync support for sale_items

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0;

-- Add index for sync_status queries
CREATE INDEX IF NOT EXISTS idx_sale_items_sync_status ON sale_items(sync_status);
