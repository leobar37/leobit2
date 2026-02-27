CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'cancelled', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."supplier_type" AS ENUM('generic', 'regular', 'internal');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('created', 'updated', 'item_added', 'item_updated', 'item_removed', 'confirmed', 'cancelled', 'delivered', 'repriced');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "business_payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"methods" jsonb DEFAULT '{"efectivo":{"enabled":true},"yape":{"enabled":false},"plin":{"enabled":false},"transferencia":{"enabled":false},"tarjeta":{"enabled":false}}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_payment_settings_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "distribucion_items" (
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
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_event_id" varchar(128),
	"created_by_business_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"variant_name" varchar(50) NOT NULL,
	"ordered_quantity" numeric(10, 3) NOT NULL,
	"delivered_quantity" numeric(10, 3),
	"unit_price_quoted" numeric(10, 2) NOT NULL,
	"unit_price_final" numeric(10, 2),
	"is_modified" boolean DEFAULT false NOT NULL,
	"original_quantity" numeric(10, 3)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"order_date" date NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"payment_intent" "sale_type" DEFAULT 'contado' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"confirmed_snapshot" jsonb,
	"delivered_snapshot" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"base_unit_quantity" numeric(10, 3) NOT NULL,
	"base_unit" varchar(20) DEFAULT 'unidad' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sync_status" "sync_status" DEFAULT 'synced' NOT NULL,
	"sync_attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_id" uuid,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "variant_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "modo_distribucion" varchar(20) DEFAULT 'estricto';--> statement-breakpoint
ALTER TABLE "abonos" ADD COLUMN "proof_image_id" uuid;--> statement-breakpoint
ALTER TABLE "abonos" ADD COLUMN "reference_number" varchar(50);--> statement-breakpoint
ALTER TABLE "distribuciones" ADD COLUMN "modo" varchar(20) DEFAULT 'estricto' NOT NULL;--> statement-breakpoint
ALTER TABLE "distribuciones" ADD COLUMN "confiar_en_vendedor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "distribuciones" ADD COLUMN "peso_confirmado" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "variant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "variant_name" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_payment_settings" ADD CONSTRAINT "business_payment_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribucion_items" ADD CONSTRAINT "distribucion_items_distribucion_id_distribuciones_id_fk" FOREIGN KEY ("distribucion_id") REFERENCES "public"."distribuciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribucion_items" ADD CONSTRAINT "distribucion_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_created_by_business_user_id_business_users_id_fk" FOREIGN KEY ("created_by_business_user_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_customers_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_business_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_id_product_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."product_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assets_business_id" ON "assets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_assets_created_at" ON "assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_assets_deleted_at" ON "assets" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_business_payment_settings_business_id" ON "business_payment_settings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_files_business_id" ON "files" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_files_created_at" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_files_deleted_at" ON "files" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_distribucion_items_distribucion_id" ON "distribucion_items" USING btree ("distribucion_id");--> statement-breakpoint
CREATE INDEX "idx_distribucion_items_variant_id" ON "distribucion_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_distribucion_items_sync_status" ON "distribucion_items" USING btree ("sync_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_distribucion_items_unique" ON "distribucion_items" USING btree ("distribucion_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_order_id" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_created_at" ON "order_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_order_events_client_event_id" ON "order_events" USING btree ("client_event_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_variant_id" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_orders_business_delivery_status" ON "orders" USING btree ("business_id","delivery_date","status");--> statement-breakpoint
CREATE INDEX "idx_orders_business_client" ON "orders" USING btree ("business_id","client_id");--> statement-breakpoint
CREATE INDEX "idx_orders_business_sync" ON "orders" USING btree ("business_id","sync_status");--> statement-breakpoint
CREATE INDEX "idx_orders_seller_id" ON "orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_product_units_business_id" ON "product_units" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_product_units_product_id" ON "product_units" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_units_variant_id" ON "product_units" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_product_units_is_active" ON "product_units" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_product_units_sync_status" ON "product_units" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_is_active" ON "product_variants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_variants_sync_status" ON "product_variants" USING btree ("sync_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variants_product_name" ON "product_variants" USING btree ("product_id","name");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_purchase_id" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_product_id" ON "purchase_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_variant_id" ON "purchase_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_business_id" ON "purchases" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_supplier_id" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_purchase_date" ON "purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "idx_purchases_status" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suppliers_business_id" ON "suppliers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_type" ON "suppliers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_suppliers_is_active" ON "suppliers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_variant_inventory_variant_id" ON "variant_inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variant_inventory_unique" ON "variant_inventory" USING btree ("variant_id");--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_proof_image_id_files_id_fk" FOREIGN KEY ("proof_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_id_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_id_files_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_abonos_proof_image_id" ON "abonos" USING btree ("proof_image_id");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_modo" ON "distribuciones" USING btree ("modo");--> statement-breakpoint
CREATE INDEX "idx_products_business_id" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_products_image_id" ON "products" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_variant_id" ON "sale_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_id" ON "sales" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_avatar_id" ON "user_profiles" USING btree ("avatar_id");--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "avatar_url";--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_unique" UNIQUE("order_id");