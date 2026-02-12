CREATE TYPE "public"."business_user_role" AS ENUM('ADMIN_NEGOCIO', 'VENDEDOR');--> statement-breakpoint
CREATE TYPE "public"."distribucion_status" AS ENUM('activo', 'cerrado', 'en_ruta');--> statement-breakpoint
CREATE TYPE "public"."modo_operacion" AS ENUM('inventario_propio', 'sin_inventario', 'pedidos', 'mixto');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('efectivo', 'yape', 'plin', 'transferencia');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('pollo', 'huevo', 'otro');--> statement-breakpoint
CREATE TYPE "public"."product_unit" AS ENUM('kg', 'unidad');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('contado', 'credito');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'VENDEDOR');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "business_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "business_user_role" DEFAULT 'VENDEDOR' NOT NULL,
	"sales_point" varchar(100),
	"commission_rate" numeric(5, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"ruc" varchar(20),
	"address" text,
	"phone" varchar(20),
	"email" varchar(100),
	"logo_url" varchar(255),
	"modo_operacion" varchar(50) DEFAULT 'inventario_propio',
	"control_kilos" boolean DEFAULT true,
	"usar_distribucion" boolean DEFAULT true,
	"permitir_venta_sin_stock" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modo_operacion" "modo_operacion" DEFAULT 'inventario_propio' NOT NULL,
	"control_kilos" boolean DEFAULT true NOT NULL,
	"usar_distribucion" boolean DEFAULT true NOT NULL,
	"permitir_venta_sin_stock" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "single_row_check" CHECK ("system_config"."id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"dni" varchar(20),
	"phone" varchar(50),
	"address" text,
	"notes" text,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"business_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abonos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" DEFAULT 'efectivo' NOT NULL,
	"notes" text,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribuciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"punto_venta" varchar(100) NOT NULL,
	"kilos_asignados" numeric(10, 3) NOT NULL,
	"kilos_vendidos" numeric(10, 3) DEFAULT '0' NOT NULL,
	"monto_recaudado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fecha" date NOT NULL,
	"estado" "distribucion_status" DEFAULT 'activo' NOT NULL,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "product_type" DEFAULT 'pollo' NOT NULL,
	"unit" "product_unit" DEFAULT 'kg' NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"client_id" uuid,
	"seller_id" uuid NOT NULL,
	"distribucion_id" uuid,
	"sale_type" "sale_type" DEFAULT 'contado' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tara" numeric(10, 3) DEFAULT '0',
	"net_weight" numeric(10, 3),
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"sale_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"invitee_name" varchar(255) NOT NULL,
	"sales_point" varchar(100),
	"token" varchar(255) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"accepted_by" varchar(255),
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"dni" varchar(20),
	"phone" varchar(50),
	"birth_date" date,
	"avatar_url" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_business_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_client_id_customers_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_seller_id_business_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribuciones" ADD CONSTRAINT "distribuciones_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribuciones" ADD CONSTRAINT "distribuciones_vendedor_id_business_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_customers_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_business_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_distribucion_id_distribuciones_id_fk" FOREIGN KEY ("distribucion_id") REFERENCES "public"."distribuciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_business_users_business_id" ON "business_users" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_business_users_user_id" ON "business_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_business_users_role" ON "business_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_business_users_unique" ON "business_users" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_businesses_name" ON "businesses" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_businesses_ruc" ON "businesses" USING btree ("ruc");--> statement-breakpoint
CREATE INDEX "idx_businesses_is_active" ON "businesses" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_customers_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_customers_dni" ON "customers" USING btree ("dni");--> statement-breakpoint
CREATE INDEX "idx_customers_business_id" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_customers_sync_status" ON "customers" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_customers_created_by" ON "customers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_abonos_business_id" ON "abonos" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_abonos_client_id" ON "abonos" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_abonos_seller_id" ON "abonos" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_abonos_payment_method" ON "abonos" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "idx_abonos_sync_status" ON "abonos" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_abonos_created_at" ON "abonos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_business_id" ON "distribuciones" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_vendedor_id" ON "distribuciones" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_fecha" ON "distribuciones" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_estado" ON "distribuciones" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_sync_status" ON "distribuciones" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_distribuciones_vendedor_fecha" ON "distribuciones" USING btree ("vendedor_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_id" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_products_type" ON "products" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_products_is_active" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sale_items_sale_id" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_product_id" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_business_id" ON "sales" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_sales_client_id" ON "sales" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_sales_seller_id" ON "sales" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_sales_distribucion_id" ON "sales" USING btree ("distribucion_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_type" ON "sales" USING btree ("sale_type");--> statement-breakpoint
CREATE INDEX "idx_sales_sync_status" ON "sales" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_date" ON "sales" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_is_active" ON "user_profiles" USING btree ("is_active");