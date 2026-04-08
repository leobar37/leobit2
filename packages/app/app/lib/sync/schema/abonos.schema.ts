/**
 * Abonos Schema
 */

export const SCHEMA_NAME = "abonos";

export const CREATE_ABONOS_TABLE = `
CREATE TABLE IF NOT EXISTS abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  business_id UUID NOT NULL,
  related_sale_id UUID,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  reference_number VARCHAR(50),
  proof_image_id UUID,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_ABONOS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_abonos_customer_id ON abonos(customer_id);
CREATE INDEX IF NOT EXISTS idx_abonos_business_id ON abonos(business_id);
CREATE INDEX IF NOT EXISTS idx_abonos_sync_status ON abonos(sync_status);
CREATE INDEX IF NOT EXISTS idx_abonos_updated_at ON abonos(updated_at);
`.trim();
