-- Migration: Add version columns to all syncable entities for optimistic locking
-- This enables proper conflict detection for multi-device scenarios

-- customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_customers_version ON customers(version);

-- products
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_products_version ON products(version);

-- product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_product_variants_version ON product_variants(version);

-- product_units
ALTER TABLE product_units ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_product_units_version ON product_units(version);

-- variant_inventory
ALTER TABLE variant_inventory ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_variant_inventory_version ON variant_inventory(version);

-- abonos (payments)
ALTER TABLE abonos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_abonos_version ON abonos(version);

-- tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_tags_version ON tags(version);

-- customer_tags
ALTER TABLE customer_tags ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_customer_tags_version ON customer_tags(version);

-- customer_groups
ALTER TABLE customer_groups ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_customer_groups_version ON customer_groups(version);

-- customer_group_members
ALTER TABLE customer_group_members ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_customer_group_members_version ON customer_group_members(version);

-- distribuciones
ALTER TABLE distribuciones ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_distribuciones_version ON distribuciones(version);

-- visitas
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_visitas_version ON visitas(version);

-- purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_purchases_version ON purchases(version);

-- purchase_items
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_purchase_items_version ON purchase_items(version);

-- suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_suppliers_version ON suppliers(version);

-- puntos_venta
ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_puntos_venta_version ON puntos_venta(version);

-- files
ALTER TABLE files ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_files_version ON files(version);

-- Backfill existing records with version 1 (already set by default, but ensure consistency)
UPDATE customers SET version = 1 WHERE version IS NULL;
UPDATE products SET version = 1 WHERE version IS NULL;
UPDATE product_variants SET version = 1 WHERE version IS NULL;
UPDATE product_units SET version = 1 WHERE version IS NULL;
UPDATE variant_inventory SET version = 1 WHERE version IS NULL;
UPDATE abonos SET version = 1 WHERE version IS NULL;
UPDATE tags SET version = 1 WHERE version IS NULL;
UPDATE customer_tags SET version = 1 WHERE version IS NULL;
UPDATE customer_groups SET version = 1 WHERE version IS NULL;
UPDATE customer_group_members SET version = 1 WHERE version IS NULL;
UPDATE distribuciones SET version = 1 WHERE version IS NULL;
UPDATE visitas SET version = 1 WHERE version IS NULL;
UPDATE purchases SET version = 1 WHERE version IS NULL;
UPDATE purchase_items SET version = 1 WHERE version IS NULL;
UPDATE suppliers SET version = 1 WHERE version IS NULL;
UPDATE puntos_venta SET version = 1 WHERE version IS NULL;
UPDATE files SET version = 1 WHERE version IS NULL;
