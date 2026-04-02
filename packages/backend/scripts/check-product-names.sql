-- Verificar productos con el mismo nombre
SELECT 
  name,
  COUNT(*) as count,
  array_agg(id) as product_ids,
  array_agg(business_id) as business_ids
FROM products
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;
