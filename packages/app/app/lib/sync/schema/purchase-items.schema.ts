/**
 * Purchase Items Schema
 */

export const SCHEMA_NAME = "purchase_items";

export const CREATE_PURCHASE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  purchase_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  unit_id UUID,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_group_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_PURCHASE_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_purchase_items_business_id ON purchase_items(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_sync_status ON purchase_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_sync_group_id ON purchase_items(sync_group_id);
`.trim();
