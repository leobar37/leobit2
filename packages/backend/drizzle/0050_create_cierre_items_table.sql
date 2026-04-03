-- Create distribucion_cierre_items table for close-time product registration
CREATE TABLE IF NOT EXISTS "distribucion_cierre_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"distribucion_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"cantidad_llevada" numeric(10, 3) NOT NULL,
	"cantidad_vendida" numeric(10, 3) NOT NULL,
	"cantidad_devuelta" numeric(10, 3) DEFAULT '0' NOT NULL,
	"monto_ventas" numeric(12, 2),
	"sync_status" "sync_status" DEFAULT 'synced' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_cierre_items_business_id" ON "distribucion_cierre_items" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_cierre_items_distribucion_id" ON "distribucion_cierre_items" ("distribucion_id");
CREATE INDEX IF NOT EXISTS "idx_cierre_items_variant_id" ON "distribucion_cierre_items" ("variant_id");
CREATE INDEX IF NOT EXISTS "idx_cierre_items_sync_status" ON "distribucion_cierre_items" ("sync_status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cierre_items_unique" ON "distribucion_cierre_items" ("distribucion_id", "variant_id");

-- Add foreign key constraints
ALTER TABLE "distribucion_cierre_items" ADD CONSTRAINT "distribucion_cierre_items_business_id_businesses_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id");

ALTER TABLE "distribucion_cierre_items" ADD CONSTRAINT "distribucion_cierre_items_distribucion_id_distribuciones_id_fk"
  FOREIGN KEY ("distribucion_id") REFERENCES "distribuciones"("id") ON DELETE CASCADE;

ALTER TABLE "distribucion_cierre_items" ADD CONSTRAINT "distribucion_cierre_items_variant_id_product_variants_id_fk"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id");

-- Enable Electric replication
ALTER TABLE "distribucion_cierre_items" REPLICA IDENTITY FULL;
