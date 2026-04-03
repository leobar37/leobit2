-- Remove modo column from distribuciones table
ALTER TABLE "distribuciones" DROP COLUMN IF EXISTS "modo";

-- Remove modo columns from businesses table
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "modo_operacion";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "modo_distribucion";

-- Remove modo_operacion from system_config table
ALTER TABLE "system_config" DROP COLUMN IF EXISTS "modo_operacion";

-- Drop the modo_operacion enum type if it exists
DROP TYPE IF EXISTS "modo_operacion";
