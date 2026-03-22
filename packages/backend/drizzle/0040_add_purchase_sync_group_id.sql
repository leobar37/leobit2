-- Add sync_group_id column to purchases for atomic sync grouping
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(100);

-- Create index for faster sync group lookups
CREATE INDEX IF NOT EXISTS idx_purchases_sync_group_id ON purchases(sync_group_id);
