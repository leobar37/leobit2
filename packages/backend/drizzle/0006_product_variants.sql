-- Product Variants table
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"sku" varchar(50),
	"unit_quantity" numeric(10, 3) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sync_status" "sync_status" DEFAULT 'synced' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_is_active" ON "product_variants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_variants_sync_status" ON "product_variants" USING btree ("sync_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variants_product_name" ON "product_variants" USING btree ("product_id", "name");

-- Variant Inventory table
CREATE TABLE "variant_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_variant_inventory_variant_id" ON "variant_inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variant_inventory_unique" ON "variant_inventory" USING btree ("variant_id");

-- Update sale_items table to add variant support
ALTER TABLE "sale_items" ADD COLUMN "variant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "variant_name" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sale_items_variant_id" ON "sale_items" USING btree ("variant_id");
