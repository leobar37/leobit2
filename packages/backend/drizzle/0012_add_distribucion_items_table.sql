CREATE TABLE IF NOT EXISTS "distribucion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribucion_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"cantidad_asignada" numeric(10, 3) NOT NULL,
	"cantidad_vendida" numeric(10, 3) DEFAULT '0' NOT NULL,
	"unidad" varchar(20) DEFAULT 'kg' NOT NULL,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "distribucion_items" ADD CONSTRAINT "distribucion_items_distribucion_id_distribuciones_id_fk" FOREIGN KEY ("distribucion_id") REFERENCES "public"."distribuciones"("id") ON DELETE cascade;

ALTER TABLE "distribucion_items" ADD CONSTRAINT "distribucion_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action;

CREATE INDEX IF NOT EXISTS "idx_distribucion_items_distribucion_id" ON "distribucion_items" USING btree ("distribucion_id");
CREATE INDEX IF NOT EXISTS "idx_distribucion_items_variant_id" ON "distribucion_items" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "idx_distribucion_items_sync_status" ON "distribucion_items" USING btree ("sync_status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_distribucion_items_unique" ON "distribucion_items" USING btree ("distribucion_id", "variant_id");
