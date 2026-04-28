-- Migration: Drop sync-only columns from operational tables
-- Generated manually due to snapshot drift (B2 schema cleanup completed)
-- Date: 2026-04-27

-- Drop sync_status and sync_attempts from all operational tables
ALTER TABLE customers DROP COLUMN IF EXISTS sync_status;
ALTER TABLE customers DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE sales DROP COLUMN IF EXISTS sync_status;
ALTER TABLE sales DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE sale_items DROP COLUMN IF EXISTS sync_status;
ALTER TABLE sale_items DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE products DROP COLUMN IF EXISTS sync_status;
ALTER TABLE products DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE product_variants DROP COLUMN IF EXISTS sync_status;
ALTER TABLE product_variants DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE distribuciones DROP COLUMN IF EXISTS sync_status;
ALTER TABLE distribuciones DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE distribucion_items DROP COLUMN IF EXISTS sync_status;
ALTER TABLE distribucion_items DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE variant_inventory DROP COLUMN IF EXISTS sync_status;
ALTER TABLE variant_inventory DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE purchases DROP COLUMN IF EXISTS sync_status;
ALTER TABLE purchases DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE purchase_items DROP COLUMN IF EXISTS sync_status;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE abonos DROP COLUMN IF EXISTS sync_status;
ALTER TABLE abonos DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE visitas DROP COLUMN IF EXISTS sync_status;
ALTER TABLE visitas DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE puntos_venta DROP COLUMN IF EXISTS sync_status;
ALTER TABLE puntos_venta DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE suppliers DROP COLUMN IF EXISTS sync_status;
ALTER TABLE suppliers DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE tags DROP COLUMN IF EXISTS sync_status;
ALTER TABLE tags DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE files DROP COLUMN IF EXISTS sync_status;
ALTER TABLE files DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE product_units DROP COLUMN IF EXISTS sync_status;
ALTER TABLE product_units DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE customer_groups DROP COLUMN IF EXISTS sync_status;
ALTER TABLE customer_groups DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE customer_group_members DROP COLUMN IF EXISTS sync_status;
ALTER TABLE customer_group_members DROP COLUMN IF EXISTS sync_attempts;

ALTER TABLE customer_tags DROP COLUMN IF EXISTS sync_status;
ALTER TABLE customer_tags DROP COLUMN IF EXISTS sync_attempts;

-- Drop version from all tables EXCEPT sales (keep sales.version for optimistic locking)
ALTER TABLE customers DROP COLUMN IF EXISTS version;
ALTER TABLE sale_items DROP COLUMN IF EXISTS version;
ALTER TABLE products DROP COLUMN IF EXISTS version;
ALTER TABLE product_variants DROP COLUMN IF EXISTS version;
ALTER TABLE distribuciones DROP COLUMN IF EXISTS version;
ALTER TABLE distribucion_items DROP COLUMN IF EXISTS version;
ALTER TABLE variant_inventory DROP COLUMN IF EXISTS version;
ALTER TABLE purchases DROP COLUMN IF EXISTS version;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS version;
ALTER TABLE abonos DROP COLUMN IF EXISTS version;
ALTER TABLE visitas DROP COLUMN IF EXISTS version;
ALTER TABLE puntos_venta DROP COLUMN IF EXISTS version;
ALTER TABLE suppliers DROP COLUMN IF EXISTS version;
ALTER TABLE tags DROP COLUMN IF EXISTS version;
ALTER TABLE files DROP COLUMN IF EXISTS version;
ALTER TABLE product_units DROP COLUMN IF EXISTS version;
ALTER TABLE customer_groups DROP COLUMN IF EXISTS version;
ALTER TABLE customer_group_members DROP COLUMN IF EXISTS version;
ALTER TABLE customer_tags DROP COLUMN IF EXISTS version;

-- Drop sync_conflicts table (no longer needed in online-first architecture)
DROP TABLE IF EXISTS sync_conflicts;

-- Drop sync_status enum (no longer referenced by any column)
DROP TYPE IF EXISTS sync_status;
