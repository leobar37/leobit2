-- Add missing cost_price_snapshot column to sale_items
-- This column is defined in the schema but was never added to the database

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price_snapshot NUMERIC(10, 2);
