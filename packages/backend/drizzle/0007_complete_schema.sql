DELETE FROM "sale_items";
DELETE FROM "sales";
DELETE FROM "abonos";
DELETE FROM "distribuciones";
DELETE FROM "customers";
DELETE FROM "inventory";
DELETE FROM "products";

ALTER TABLE "abonos" ADD COLUMN "proof_image_url" text;

CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text
);

ALTER TABLE "assets" ADD CONSTRAINT "assets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assets" ADD CONSTRAINT "assets_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_assets_business_id" ON "assets" USING btree ("business_id");
CREATE INDEX "idx_assets_created_at" ON "assets" USING btree ("created_at");
CREATE INDEX "idx_assets_deleted_at" ON "assets" USING btree ("deleted_at");

CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text
);

ALTER TABLE "files" ADD CONSTRAINT "files_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_files_business_id" ON "files" USING btree ("business_id");
CREATE INDEX "idx_files_created_at" ON "files" USING btree ("created_at");
CREATE INDEX "idx_files_deleted_at" ON "files" USING btree ("deleted_at");

ALTER TABLE "products" ADD COLUMN "image_id" uuid;
ALTER TABLE "products" ADD CONSTRAINT "products_image_id_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_products_image_id" ON "products" USING btree ("image_id");

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

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_variants_product_id" ON "product_variants" USING btree ("product_id");
CREATE INDEX "idx_variants_is_active" ON "product_variants" USING btree ("is_active");
CREATE INDEX "idx_variants_sync_status" ON "product_variants" USING btree ("sync_status");
CREATE UNIQUE INDEX "idx_variants_product_name" ON "product_variants" USING btree ("product_id", "name");

CREATE TABLE "variant_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_variant_inventory_variant_id" ON "variant_inventory" USING btree ("variant_id");
CREATE UNIQUE INDEX "idx_variant_inventory_unique" ON "variant_inventory" USING btree ("variant_id");

ALTER TABLE "sale_items" ADD COLUMN "variant_id" uuid NOT NULL;
ALTER TABLE "sale_items" ADD COLUMN "variant_name" varchar(50) NOT NULL;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_sale_items_variant_id" ON "sale_items" USING btree ("variant_id");

CREATE TYPE "supplier_type" AS ENUM ('generic', 'regular', 'internal');
CREATE TYPE "purchase_status" AS ENUM ('pending', 'received', 'cancelled');

CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "supplier_type" DEFAULT 'regular' NOT NULL,
	"ruc" varchar(20),
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_suppliers_business_id" ON "suppliers" USING btree ("business_id");
CREATE INDEX "idx_suppliers_type" ON "suppliers" USING btree ("type");
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");
CREATE INDEX "idx_suppliers_is_active" ON "suppliers" USING btree ("is_active");

CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_date" date NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"invoice_number" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_purchases_business_id" ON "purchases" USING btree ("business_id");
CREATE INDEX "idx_purchases_supplier_id" ON "purchases" USING btree ("supplier_id");
CREATE INDEX "idx_purchases_purchase_date" ON "purchases" USING btree ("purchase_date");
CREATE INDEX "idx_purchases_status" ON "purchases" USING btree ("status");

CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_purchase_items_purchase_id" ON "purchase_items" USING btree ("purchase_id");
CREATE INDEX "idx_purchase_items_product_id" ON "purchase_items" USING btree ("product_id");
CREATE INDEX "idx_purchase_items_variant_id" ON "purchase_items" USING btree ("variant_id");
