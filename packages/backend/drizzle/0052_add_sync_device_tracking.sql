-- Migration: Add device tracking to sync operations for multi-device conflict resolution

-- Add device tracking columns to sync_operations table
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS source_fingerprint TEXT;

-- Create indexes for device tracking queries
CREATE INDEX IF NOT EXISTS idx_sync_operations_device_id ON sync_operations(business_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_fingerprint ON sync_operations(source_fingerprint);

-- Add device info to sync_conflicts for better debugging
ALTER TABLE sync_conflicts ADD COLUMN IF NOT EXISTS source_device_id TEXT;
ALTER TABLE sync_conflicts ADD COLUMN IF NOT EXISTS source_fingerprint TEXT;

-- Create indexes for conflict tracking
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_device ON sync_conflicts(source_device_id);
