CREATE TYPE "public"."refund_method" AS ENUM('efectivo', 'yape', 'plin', 'transferencia', 'saldo');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'saldo';--> statement-breakpoint
ALTER TABLE "abonos" ADD COLUMN "related_sale_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "status" "sale_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "refund_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "refund_date" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "refund_method" "refund_method";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "refund_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "refund_notes" text;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_related_sale_id_sales_id_fk" FOREIGN KEY ("related_sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_business_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_abonos_related_sale_id" ON "abonos" USING btree ("related_sale_id");--> statement-breakpoint
CREATE INDEX "idx_sales_status" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sales_cancelled_at" ON "sales" USING btree ("cancelled_at");