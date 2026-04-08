/**
 * Visitas Schema
 */

export const SCHEMA_NAME = "visitas";

export const CREATE_VISITAS_TABLE = `
CREATE TABLE IF NOT EXISTS visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  distribucion_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  motivo_no_compra VARCHAR(255),
  sale_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_VISITAS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_visitas_business_id ON visitas(business_id);
CREATE INDEX IF NOT EXISTS idx_visitas_distribucion_id ON visitas(distribucion_id);
CREATE INDEX IF NOT EXISTS idx_visitas_customer_id ON visitas(customer_id);
CREATE INDEX IF NOT EXISTS idx_visitas_vendedor_id ON visitas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_visitas_status ON visitas(status);
CREATE INDEX IF NOT EXISTS idx_visitas_sale_id ON visitas(sale_id);
CREATE INDEX IF NOT EXISTS idx_visitas_sync_status ON visitas(sync_status);
CREATE INDEX IF NOT EXISTS idx_visitas_created_at ON visitas(created_at);
`.trim();
