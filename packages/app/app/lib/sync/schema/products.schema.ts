/**
 * Products Schema
 */

export const SCHEMA_NAME = "products";

export const CREATE_PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type TEXT NOT NULL DEFAULT 'pollo',
  unit TEXT NOT NULL DEFAULT 'kg',
  base_price DECIMAL(10,2) NOT NULL DEFAULT '0',
  cost_price DECIMAL(10,2) NOT NULL DEFAULT '0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_variants BOOLEAN NOT NULL DEFAULT false,
  image_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_PRODUCTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(sync_status);
`.trim();
