CREATE TABLE "customer_tags" (
	"customer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	CONSTRAINT "customer_tags_customer_id_tag_id_pk" PRIMARY KEY("customer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20) DEFAULT '#f97316' NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abonos" DROP CONSTRAINT "abonos_related_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_advance_proof_image_id_files_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_cancelled_by_business_users_id_fk";
--> statement-breakpoint
ALTER TABLE "abonos" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "abonos" ALTER COLUMN "payment_method" SET DEFAULT 'efectivo'::text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('efectivo', 'yape', 'plin', 'transferencia');--> statement-breakpoint
ALTER TABLE "abonos" ALTER COLUMN "payment_method" SET DEFAULT 'efectivo'::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "abonos" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
DROP INDEX "idx_abonos_related_sale_id";--> statement-breakpoint
DROP INDEX "idx_orders_payment_status";--> statement-breakpoint
DROP INDEX "idx_sales_status";--> statement-breakpoint
DROP INDEX "idx_sales_cancelled_at";--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_assigned_by_business_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_tags_customer_id" ON "customer_tags" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_tag_id" ON "customer_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_tags_business_id" ON "tags" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_tags_name" ON "tags" USING btree ("name");--> statement-breakpoint
ALTER TABLE "abonos" DROP COLUMN "related_sale_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "advance_amount";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "balance_due";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "advance_payment_method";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "advance_reference_number";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "advance_proof_image_id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "cancelled_at";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "cancelled_by";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "cancel_reason";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "refund_amount";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "refund_date";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "refund_method";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "refund_reference";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "refund_notes";--> statement-breakpoint
DROP TYPE "public"."order_payment_status";--> statement-breakpoint
DROP TYPE "public"."refund_method";--> statement-breakpoint
DROP TYPE "public"."sale_status";