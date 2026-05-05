-- Remove unused configuration columns from businesses table
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "control_kilos";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "permitir_venta_sin_stock";

-- Remove unused configuration columns from system_config table
ALTER TABLE "system_config" DROP COLUMN IF EXISTS "control_kilos";
ALTER TABLE "system_config" DROP COLUMN IF EXISTS "permitir_venta_sin_stock";
