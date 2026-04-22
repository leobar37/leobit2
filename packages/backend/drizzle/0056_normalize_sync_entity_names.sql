-- Normalize legacy camelCase sync entity identifiers to canonical snake_case.
-- Idempotent: running multiple times is safe.

UPDATE sync_operations
SET entity = CASE entity
  WHEN 'saleItems' THEN 'sale_items'
  WHEN 'purchaseItems' THEN 'purchase_items'
  WHEN 'productVariants' THEN 'product_variants'
  WHEN 'customerTags' THEN 'customer_tags'
  WHEN 'customerGroups' THEN 'customer_groups'
  WHEN 'customerGroupMembers' THEN 'customer_group_members'
  WHEN 'distribucionItems' THEN 'distribucion_items'
  ELSE entity
END
WHERE entity IN (
  'saleItems',
  'purchaseItems',
  'productVariants',
  'customerTags',
  'customerGroups',
  'customerGroupMembers',
  'distribucionItems'
);

UPDATE sync_dead_letter
SET entity = CASE entity
  WHEN 'saleItems' THEN 'sale_items'
  WHEN 'purchaseItems' THEN 'purchase_items'
  WHEN 'productVariants' THEN 'product_variants'
  WHEN 'customerTags' THEN 'customer_tags'
  WHEN 'customerGroups' THEN 'customer_groups'
  WHEN 'customerGroupMembers' THEN 'customer_group_members'
  WHEN 'distribucionItems' THEN 'distribucion_items'
  ELSE entity
END
WHERE entity IN (
  'saleItems',
  'purchaseItems',
  'productVariants',
  'customerTags',
  'customerGroups',
  'customerGroupMembers',
  'distribucionItems'
);

UPDATE sync_conflicts
SET entity_type = CASE entity_type
  WHEN 'saleItems' THEN 'sale_items'
  WHEN 'purchaseItems' THEN 'purchase_items'
  WHEN 'productVariants' THEN 'product_variants'
  WHEN 'customerTags' THEN 'customer_tags'
  WHEN 'customerGroups' THEN 'customer_groups'
  WHEN 'customerGroupMembers' THEN 'customer_group_members'
  WHEN 'distribucionItems' THEN 'distribucion_items'
  ELSE entity_type
END
WHERE entity_type IN (
  'saleItems',
  'purchaseItems',
  'productVariants',
  'customerTags',
  'customerGroups',
  'customerGroupMembers',
  'distribucionItems'
);
