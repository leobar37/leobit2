-- Add sync_group_id column to sale_items for atomic sync grouping
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(100);

-- Add sync_group_id column to purchase_items for atomic sync grouping
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(100);

-- Create indexes for faster sync group lookups on items
CREATE INDEX IF NOT EXISTS idx_sale_items_sync_group_id ON sale_items(sync_group_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_sync_group_id ON purchase_items(sync_group_id);
