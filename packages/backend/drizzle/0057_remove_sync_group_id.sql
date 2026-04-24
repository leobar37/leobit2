DROP INDEX IF EXISTS idx_sale_items_sync_group_id;
DROP INDEX IF EXISTS idx_purchases_sync_group_id;
DROP INDEX IF EXISTS idx_purchase_items_sync_group_id;
ALTER TABLE sales DROP COLUMN IF EXISTS sync_group_id;
ALTER TABLE sale_items DROP COLUMN IF EXISTS sync_group_id;
ALTER TABLE purchases DROP COLUMN IF EXISTS sync_group_id;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sync_group_id;
