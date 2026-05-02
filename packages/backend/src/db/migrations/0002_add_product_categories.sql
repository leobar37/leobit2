-- Migration: add product categories and backfill from legacy product type

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#f97316',
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_business_id
  ON product_categories(business_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_name
  ON product_categories(name);

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_categories_business_name_ci
  ON product_categories(business_id, lower(name));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID;

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products(category_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_category_id_product_categories_id_fk'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_category_id_product_categories_id_fk
      FOREIGN KEY (category_id)
      REFERENCES product_categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

INSERT INTO product_categories (business_id, name, color)
SELECT source.business_id, source.name, '#f97316'
FROM (
  SELECT DISTINCT p.business_id, 'Pollo'::VARCHAR(100) AS name
  FROM products p
  WHERE p.type::TEXT = 'pollo'

  UNION

  SELECT DISTINCT p.business_id, 'Huevo'::VARCHAR(100) AS name
  FROM products p
  WHERE p.type::TEXT = 'huevo'

  UNION

  SELECT DISTINCT p.business_id, 'Otro'::VARCHAR(100) AS name
  FROM products p
  WHERE p.type::TEXT = 'otro'
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM product_categories existing
  WHERE existing.business_id = source.business_id
    AND lower(existing.name) = lower(source.name)
);

WITH category_mapping AS (
  SELECT DISTINCT ON (pc.business_id, lower(pc.name))
    pc.business_id,
    lower(pc.name) AS normalized_name,
    pc.id
  FROM product_categories pc
  ORDER BY pc.business_id, lower(pc.name), pc.created_at, pc.id
)
UPDATE products p
SET category_id = cm.id
FROM category_mapping cm
WHERE p.business_id = cm.business_id
  AND (
    (p.type::TEXT = 'pollo' AND cm.normalized_name = 'pollo')
    OR (p.type::TEXT = 'huevo' AND cm.normalized_name = 'huevo')
    OR (p.type::TEXT = 'otro' AND cm.normalized_name = 'otro')
  );

UPDATE products
SET category_id = NULL
WHERE type IS NULL
   OR type::TEXT NOT IN ('pollo', 'huevo', 'otro');
