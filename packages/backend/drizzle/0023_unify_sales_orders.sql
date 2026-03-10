-- Migration: Unify Sales and Orders
-- Adds pre_order support to sales table and removes order dependency

-- Add new columns to sales table for pre_order support
ALTER TABLE sales ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'instant_sale';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS confirmed_snapshot JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivered_snapshot JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS allow_customer_edit BOOLEAN DEFAULT true;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS advance_payment_method VARCHAR(20);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS advance_reference_number VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS advance_proof_image_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add new columns to sale_items for pre_order support
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS ordered_quantity DECIMAL(10, 3);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS delivered_quantity DECIMAL(10, 3);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_price_quoted DECIMAL(10, 2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_price_final DECIMAL(10, 2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS is_modified BOOLEAN DEFAULT false;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS original_quantity DECIMAL(10, 3);

-- Make quantity nullable (for pre_orders use ordered_quantity instead)
ALTER TABLE sale_items ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE sale_items ALTER COLUMN unit_price DROP NOT NULL;

-- Add foreign key for advance_proof_image_id
ALTER TABLE sales ADD CONSTRAINT fk_sales_advance_proof_image
    FOREIGN KEY (advance_proof_image_id) REFERENCES files(id) ON DELETE SET NULL;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_date ON sales(delivery_date);

-- Update existing sales to have type='instant_sale'
UPDATE sales SET type = 'instant_sale' WHERE type IS NULL;

-- Add REPLICA IDENTITY FULL for ElectricSQL sync (if not already set)
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE sale_items REPLICA IDENTITY FULL;

-- Note: order_id column is kept for backward compatibility during transition
-- It will be removed in a future migration after data migration is complete
