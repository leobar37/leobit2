-- Script para verificar ventas sin seller_id
-- Ejecutar en la base de datos PostgreSQL

-- 1. Contar ventas sin seller_id
SELECT 
    'Ventas sin seller_id' as check_type,
    COUNT(*) as count
FROM sales 
WHERE seller_id IS NULL;

-- 2. Ver detalle de ventas sin seller_id (si existen)
SELECT 
    id,
    business_id,
    customer_id,
    seller_id,
    type,
    status,
    total_amount,
    created_at
FROM sales 
WHERE seller_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver todas las ventas por estado de seller_id
SELECT 
    CASE 
        WHEN seller_id IS NULL THEN 'Sin seller_id'
        ELSE 'Con seller_id'
    END as tiene_seller,
    COUNT(*) as total
FROM sales
GROUP BY 
    CASE 
        WHEN seller_id IS NULL THEN 'Sin seller_id'
        ELSE 'Con seller_id'
    END;

-- 4. Ver ventas recientes (últimas 24h) para ver el patrón
SELECT 
    id,
    seller_id,
    type,
    status,
    created_at
FROM sales 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;