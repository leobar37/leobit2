/**
 * Variant Inventory Schema
 */

export const SCHEMA_NAME = "variant_inventory";

export const CREATE_VARIANT_INVENTORY_TABLE = `
CREATE TABLE IF NOT EXISTS variant_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT '0',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_VARIANT_INVENTORY_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_variant_inventory_business_id ON variant_inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_variant_inventory_variant_id ON variant_inventory(variant_id);
`.trim();
