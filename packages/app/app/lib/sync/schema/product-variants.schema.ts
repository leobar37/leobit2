/**
 * Product Variants Schema
 */

export const SCHEMA_NAME = "product_variants";

export const CREATE_PRODUCT_VARIANTS_TABLE = `
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  business_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  sku VARCHAR(50),
  unit_quantity DECIMAL(10,3) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT '0',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_PRODUCT_VARIANTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_business_id ON product_variants(business_id);
`.trim();
