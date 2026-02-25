CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'cancelled', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('created', 'updated', 'item_added', 'item_updated', 'item_removed', 'confirmed', 'cancelled', 'delivered', 'repriced');--> statement-breakpoint

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
);--> statement-breakpoint

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
);--> statement-breakpoint

CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_event_id" varchar(128),
	"created_by_business_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "sales" ADD COLUMN "order_id" uuid;--> statement-breakpoint

ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_customers_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_business_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_created_by_business_user_id_business_users_id_fk" FOREIGN KEY ("created_by_business_user_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_unique" UNIQUE("order_id");--> statement-breakpoint

CREATE INDEX "idx_orders_business_delivery_status" ON "orders" USING btree ("business_id","delivery_date","status");--> statement-breakpoint
CREATE INDEX "idx_orders_business_client" ON "orders" USING btree ("business_id","client_id");--> statement-breakpoint
CREATE INDEX "idx_orders_business_sync" ON "orders" USING btree ("business_id","sync_status");--> statement-breakpoint
CREATE INDEX "idx_orders_seller_id" ON "orders" USING btree ("seller_id");--> statement-breakpoint

CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_variant_id" ON "order_items" USING btree ("variant_id");--> statement-breakpoint

CREATE INDEX "idx_order_events_order_id" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_created_at" ON "order_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_order_events_client_event_id" ON "order_events" USING btree ("client_event_id");--> statement-breakpoint

CREATE INDEX "idx_sales_order_id" ON "sales" USING btree ("order_id");
