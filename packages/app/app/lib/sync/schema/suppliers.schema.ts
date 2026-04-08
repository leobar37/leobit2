/**
 * Suppliers Schema
 */

export const SCHEMA_NAME = "suppliers";

export const CREATE_SUPPLIERS_TABLE = `
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type TEXT NOT NULL DEFAULT 'generic',
  ruc VARCHAR(20),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_SUPPLIERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_sync_status ON suppliers(sync_status);
`.trim();
