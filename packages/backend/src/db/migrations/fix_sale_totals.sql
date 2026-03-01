-- Fix corrupted sales data where totalAmount doesn't match sum of items
-- This script:
-- 1. Identifies corrupted sales
-- 2. Fixes the totalAmount to match item sum
-- 3. Recalculates balanceDue for credit sales

-- Step 1: Show corrupted sales (for review)
SELECT 
    s.id,
    s.total_amount as current_total,
    (
        SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0)
        FROM sale_items si
        WHERE si.sale_id = s.id
    ) as calculated_total,
    s.sale_type,
    s.amount_paid,
    s.balance_due,
    ABS(
        CAST(s.total_amount AS numeric) - 
        (SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0) FROM sale_items si WHERE si.sale_id = s.id)
    ) as difference
FROM sales s
WHERE ABS(
    CAST(s.total_amount AS numeric) - 
    (SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0) FROM sale_items si WHERE si.sale_id = s.id)
) > 0.01
ORDER BY s.created_at DESC;

-- Step 2: Fix total_amount for corrupted sales
UPDATE sales
SET total_amount = (
    SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0)::text
    FROM sale_items si
    WHERE si.sale_id = sales.id
)
WHERE id IN (
    SELECT s.id
    FROM sales s
    WHERE ABS(
        CAST(s.total_amount AS numeric) - 
        (SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0) FROM sale_items si WHERE si.sale_id = s.id)
    ) > 0.01
);

-- Step 3: Fix balance_due for credit sales (balance_due = total_amount - amount_paid)
UPDATE sales
SET balance_due = (
    CAST(total_amount AS numeric) - COALESCE(CAST(amount_paid AS numeric), 0)
)::text
WHERE sale_type = 'credito';

-- Step 4: Verify the fix
SELECT 
    s.id,
    s.total_amount as current_total,
    (
        SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0)
        FROM sale_items si
        WHERE si.sale_id = s.id
    ) as calculated_total,
    ABS(
        CAST(s.total_amount AS numeric) - 
        (SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0) FROM sale_items si WHERE si.sale_id = s.id)
    ) as difference
FROM sales s
WHERE ABS(
    CAST(s.total_amount AS numeric) - 
    (SELECT COALESCE(SUM(CAST(si.subtotal AS numeric)), 0) FROM sale_items si WHERE si.sale_id = s.id)
) > 0.01;
