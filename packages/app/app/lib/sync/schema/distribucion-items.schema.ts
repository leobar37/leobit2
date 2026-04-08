/**
 * Distribucion Items Schema
 */

export const SCHEMA_NAME = "distribucion_items";

export const CREATE_DISTRIBUCION_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS distribucion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  distribucion_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  cantidad_asignada DECIMAL(10,3) NOT NULL,
  cantidad_vendida DECIMAL(10,3) NOT NULL DEFAULT '0',
  unidad TEXT NOT NULL DEFAULT 'kg',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_DISTRIBUCION_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_distribucion_items_business_id ON distribucion_items(business_id);
CREATE INDEX IF NOT EXISTS idx_distribucion_items_distribucion_id ON distribucion_items(distribucion_id);
`.trim();
