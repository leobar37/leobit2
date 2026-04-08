/**
 * Purchases Schema
 */

export const SCHEMA_NAME = "purchases";

export const CREATE_PURCHASES_TABLE = `
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  supplier_id UUID,
  purchase_date DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_number VARCHAR(50),
  receipt_image_id UUID,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_group_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_PURCHASES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_sync_status ON purchases(sync_status);
`.trim();
