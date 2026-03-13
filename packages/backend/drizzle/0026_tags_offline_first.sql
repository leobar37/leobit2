-- Add sync status fields to tags and customer_tags tables
-- Migration: offline-first tags support

-- Add sync_status to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE tags ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0;

-- Add sync_status to customer_tags table
ALTER TABLE customer_tags ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE customer_tags ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0;

-- Create indexes for sync status queries
CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);
CREATE INDEX IF NOT EXISTS idx_customer_tags_sync_status ON customer_tags(sync_status);
