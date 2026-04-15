/**
 * Distribuciones Schema
 */

export const SCHEMA_NAME = "distribuciones";

export const CREATE_DISTRIBUCIONES_TABLE = `
CREATE TABLE IF NOT EXISTS distribuciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  punto_venta VARCHAR(100) NOT NULL,
  punto_venta_id UUID,
  monto_recaudado DECIMAL(12,2) NOT NULL DEFAULT '0',
  nota_creacion TEXT,
  nota_cierre TEXT,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  modo TEXT NOT NULL DEFAULT 'estricto',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_DISTRIBUCIONES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_distribuciones_business_id ON distribuciones(business_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_vendedor_id ON distribuciones(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_sync_status ON distribuciones(sync_status);
CREATE INDEX IF NOT EXISTS idx_distribuciones_punto_venta_id ON distribuciones(punto_venta_id);
`.trim();
