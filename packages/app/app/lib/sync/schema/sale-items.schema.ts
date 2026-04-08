/**
 * Sale Items Schema
 */

export const SCHEMA_NAME = "sale_items";

export const CREATE_SALE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,3),
  ordered_quantity DECIMAL(10,3),
  delivered_quantity DECIMAL(10,3),
  unit_price DECIMAL(10,2),
  unit_price_quoted DECIMAL(10,2),
  unit_price_final DECIMAL(10,2),
  cost_price_snapshot DECIMAL(10,2),
  subtotal DECIMAL(12,2) NOT NULL,
  is_modified BOOLEAN NOT NULL DEFAULT false,
  original_quantity DECIMAL(10,3),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_group_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_SALE_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_business_id ON sale_items(business_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sync_status ON sale_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sync_group_id ON sale_items(sync_group_id);
`.trim();
