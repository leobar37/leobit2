-- Migration: Orders → Sales
-- Date: 2025-03-10
-- Description: Extends sales table to support orders functionality and migrates all order data

-- =====================================================
-- STEP 1: Extend sales table with new columns
-- =====================================================

ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS confirmed_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS delivered_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'sin_pago' NOT NULL,
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS advance_payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS advance_reference_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS advance_proof_image_id UUID REFERENCES files(id),
  ADD COLUMN IF NOT EXISTS allow_customer_edit BOOLEAN DEFAULT true NOT NULL;

-- Update existing sales records
UPDATE sales SET status = 'active' WHERE status IS NULL OR status = '';

-- =====================================================
-- STEP 2: Extend sale_items table
-- =====================================================

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS ordered_quantity DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS delivered_quantity DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS unit_price_quoted DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS unit_price_final DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_modified BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS original_quantity DECIMAL(10,3);

-- =====================================================
-- STEP 3: Create sale_tokens table
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_tokens_token ON sale_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_sale_id ON sale_tokens(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_expires ON sale_tokens(expires_at);

-- =====================================================
-- STEP 4: Migrate orders to sales
-- =====================================================

INSERT INTO sales (
  id, business_id, client_id, seller_id,
  status, delivery_date, sale_date,
  sale_type, payment_status, total_amount, advance_amount, balance_due,
  advance_payment_method, advance_reference_number, advance_proof_image_id,
  version, confirmed_snapshot, delivered_snapshot, allow_customer_edit,
  sync_status, sync_attempts, created_at
)
SELECT 
  o.id, o.business_id, o.client_id, o.seller_id,
  CASE 
    WHEN o.status = 'draft' THEN 'draft'::varchar
    WHEN o.status = 'confirmed' THEN 'confirmed'::varchar
    WHEN o.status = 'delivered' THEN 'delivered'::varchar
    WHEN o.status = 'cancelled' THEN 'cancelled'::varchar
    ELSE 'confirmed'::varchar
  END,
  o.delivery_date, 
  COALESCE(o.order_date::timestamp, o.created_at),
  o.payment_intent,
  o.payment_status,
  o.total_amount,
  o.advance_amount,
  o.balance_due,
  o.advance_payment_method,
  o.advance_reference_number,
  o.advance_proof_image_id,
  o.version,
  o.confirmed_snapshot,
  o.delivered_snapshot,
  o.allow_customer_edit,
  o.sync_status,
  o.sync_attempts,
  o.created_at
FROM orders o
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 5: Migrate order_items to sale_items
-- =====================================================

INSERT INTO sale_items (
  id, sale_id, product_id, variant_id,
  product_name, variant_name,
  quantity, ordered_quantity, delivered_quantity,
  unit_price, unit_price_quoted, unit_price_final,
  subtotal, is_modified, original_quantity
)
SELECT 
  oi.id, oi.order_id, oi.product_id, oi.variant_id,
  oi.product_name, oi.variant_name,
  oi.ordered_quantity,
  oi.ordered_quantity,
  oi.delivered_quantity,
  oi.unit_price_quoted,
  oi.unit_price_quoted,
  oi.unit_price_final,
  (oi.ordered_quantity::decimal * oi.unit_price_quoted::decimal),
  oi.is_modified,
  oi.original_quantity
FROM order_items oi
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: Migrate order_tokens to sale_tokens
-- =====================================================

INSERT INTO sale_tokens (id, sale_id, token, expires_at, used_at, created_at)
SELECT id, order_id, token, expires_at, used_at, created_at
FROM order_tokens
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 7: Update foreign key references in abonos
-- =====================================================

UPDATE abonos 
SET related_sale_id = related_order_id 
WHERE related_order_id IS NOT NULL AND related_sale_id IS NULL;

-- =====================================================
-- STEP 8: Create new indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sales_delivery_date ON sales(delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_status_delivery ON sales(status, delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_business_delivery ON sales(business_id, delivery_date);

-- =====================================================
-- STEP 9: Verification query
-- =====================================================

SELECT 
  'Ventas instantáneas (delivery_date IS NULL)' as tipo,
  COUNT(*) as cantidad
FROM sales 
WHERE delivery_date IS NULL
UNION ALL
SELECT 
  'Pedidos migrados (delivery_date IS NOT NULL)' as tipo,
  COUNT(*) as cantidad
FROM sales 
WHERE delivery_date IS NOT NULL
UNION ALL
SELECT 
  'Items migrados' as tipo,
  COUNT(*) as cantidad
FROM sale_items
WHERE sale_id IN (SELECT id FROM sales WHERE delivery_date IS NOT NULL);

-- =====================================================
-- STEP 10: Drop old tables (RUN ONLY AFTER VERIFICATION)
-- =====================================================
-- Uncomment after confirming migration success:
-- DROP TABLE IF EXISTS order_tokens;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS order_events;
-- DROP TABLE IF EXISTS orders;
