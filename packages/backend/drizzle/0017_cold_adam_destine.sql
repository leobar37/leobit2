DO $$ BEGIN
    CREATE TYPE "public"."refund_method" AS ENUM('efectivo', 'yape', 'plin', 'transferencia', 'saldo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."sale_status" AS ENUM('active', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TYPE "public"."payment_method" ADD VALUE 'saldo';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "abonos" ADD COLUMN IF NOT EXISTS "related_sale_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "status" "sale_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refund_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refund_date" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refund_method" "refund_method";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refund_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refund_notes" text;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "abonos" ADD CONSTRAINT "abonos_related_sale_id_sales_id_fk" FOREIGN KEY ("related_sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_business_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_abonos_related_sale_id" ON "abonos" USING btree ("related_sale_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_status" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_cancelled_at" ON "sales" USING btree ("cancelled_at");