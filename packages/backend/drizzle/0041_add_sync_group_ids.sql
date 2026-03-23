-- Add sync_group_id column to sales for atomic sync grouping
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(100);

-- Add sync_group_id column to sync_operations for atomic sync grouping
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(128);

-- Create indexes for faster sync group lookups
CREATE INDEX IF NOT EXISTS idx_sales_sync_group_id ON sales(sync_group_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_sync_group_id ON sync_operations(sync_group_id);