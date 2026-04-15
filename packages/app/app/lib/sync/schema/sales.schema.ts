/**
 * Sales Schema
 */

export const SCHEMA_NAME = "sales";

export const CREATE_SALES_TABLE = `
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID,
  seller_id UUID,
  distribucion_id UUID,
  visita_id UUID,
  type TEXT NOT NULL DEFAULT 'instant_sale',
  sale_type TEXT NOT NULL DEFAULT 'contado',
  payment_mode TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT '0',
  balance_due DECIMAL(12,2) NOT NULL DEFAULT '0',
  tara DECIMAL(10,3) DEFAULT '0',
  net_weight DECIMAL(10,3),
  sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivery_date DATE,
  order_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  confirmed_snapshot JSONB,
  delivered_snapshot JSONB,
  allow_customer_edit BOOLEAN NOT NULL DEFAULT true,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_group_id TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by UUID,
  cancel_reason TEXT,
  refund_amount DECIMAL(12,2),
  refund_date TIMESTAMP,
  refund_method TEXT,
  refund_reference VARCHAR(100),
  refund_notes TEXT,
  advance_payment_method VARCHAR(20),
  advance_reference_number VARCHAR(50),
  advance_proof_image_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_SALES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_visita_id ON sales(visita_id);
CREATE INDEX IF NOT EXISTS idx_sales_distribucion_id ON sales(distribucion_id);
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_status_date ON sales(business_id, status, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_distribucion_date ON sales(business_id, distribucion_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_type_date ON sales(business_id, type, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_sale_type_date ON sales(business_id, sale_type, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_customer_date ON sales(business_id, customer_id, sale_date);
`.trim();
