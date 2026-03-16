-- Visitas Schema
-- Visit records linked to distributions for vendor tracking

-- Create visita_status enum if not exists
DO $$ BEGIN
  CREATE TYPE "visita_status" AS ENUM ('pendiente', 'compro', 'no_compra');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create visitas table
CREATE TABLE IF NOT EXISTS "visitas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "distribucion_id" uuid NOT NULL REFERENCES "distribuciones"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "vendedor_id" uuid NOT NULL REFERENCES "business_users"("id"),
  "status" "visita_status" NOT NULL DEFAULT 'pendiente',
  "motivo_no_compra" varchar(255),
  "sale_id" uuid REFERENCES "sales"("id"),
  "sync_status" "sync_status" NOT NULL DEFAULT 'synced',
  "sync_attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for visitas
CREATE INDEX IF NOT EXISTS "idx_visitas_business_id" ON "visitas"("business_id");
CREATE INDEX IF NOT EXISTS "idx_visitas_distribucion_id" ON "visitas"("distribucion_id");
CREATE INDEX IF NOT EXISTS "idx_visitas_customer_id" ON "visitas"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_visitas_vendedor_id" ON "visitas"("vendedor_id");
CREATE INDEX IF NOT EXISTS "idx_visitas_status" ON "visitas"("status");
CREATE INDEX IF NOT EXISTS "idx_visitas_sale_id" ON "visitas"("sale_id");
CREATE INDEX IF NOT EXISTS "idx_visitas_sync_status" ON "visitas"("sync_status");
CREATE INDEX IF NOT EXISTS "idx_visitas_created_at" ON "visitas"("created_at");
