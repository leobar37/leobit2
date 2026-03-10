-- Rollback: Restore Orders Tables
-- Date: 2025-03-10
-- Description: Reverts migration from orders to sales in case of issues

-- =====================================================
-- STEP 1: Restore orders table data from sales
-- =====================================================

INSERT INTO orders (
  id, business_id, client_id, seller_id,
  status, delivery_date, order_date,
  payment_intent, payment_status, total_amount, advance_amount, balance_due,
  advance_payment_method, advance_reference_number, advance_proof_image_id,
  version, confirmed_snapshot, delivered_snapshot, allow_customer_edit,
  sync_status, sync_attempts, created_at
)
SELECT 
  s.id, s.business_id, s.client_id, s.seller_id,
  CASE 
    WHEN s.status = 'draft' THEN 'draft'::order_status
    WHEN s.status = 'confirmed' THEN 'confirmed'::order_status
    WHEN s.status = 'delivered' THEN 'delivered'::order_status
    WHEN s.status = 'cancelled' THEN 'cancelled'::order_status
    ELSE 'confirmed'::order_status
  END,
  s.delivery_date, 
  COALESCE(s.sale_date::date, s.created_at::date),
  s.sale_type,
  s.payment_status,
  s.total_amount,
  s.advance_amount,
  s.balance_due,
  s.advance_payment_method,
  s.advance_reference_number,
  s.advance_proof_image_id,
  s.version,
  s.confirmed_snapshot,
  s.delivered_snapshot,
  s.allow_customer_edit,
  s.sync_status,
  s.sync_attempts,
  s.created_at
FROM sales s
WHERE s.delivery_date IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Restore order_items from sale_items
-- =====================================================

INSERT INTO order_items (
  id, order_id, product_id, variant_id,
  product_name, variant_name,
  ordered_quantity, delivered_quantity,
  unit_price_quoted, unit_price_final,
  is_modified, original_quantity
)
SELECT 
  si.id, si.sale_id, si.product_id, si.variant_id,
  si.product_name, si.variant_name,
  si.ordered_quantity, si.delivered_quantity,
  si.unit_price_quoted, si.unit_price_final,
  si.is_modified, si.original_quantity
FROM sale_items si
WHERE si.sale_id IN (SELECT id FROM orders)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Restore order_tokens from sale_tokens
-- =====================================================

INSERT INTO order_tokens (id, order_id, token, expires_at, used_at, created_at)
SELECT id, sale_id, token, expires_at, used_at, created_at
FROM sale_tokens
WHERE sale_id IN (SELECT id FROM orders)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: Restore abonos references
-- =====================================================

UPDATE abonos 
SET related_order_id = related_sale_id 
WHERE related_sale_id IS NOT NULL AND related_order_id IS NULL;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

SELECT 
  'Orders restaurados' as tipo,
  COUNT(*) as cantidad
FROM orders;
