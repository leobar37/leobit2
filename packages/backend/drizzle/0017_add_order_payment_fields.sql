-- Migration: Add order payment fields
-- Only adds the new columns to orders table that are missing from the database

-- Create the enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."order_payment_status" AS ENUM('sin_pago', 'adelanto_parcial', 'pagado_total', 'saldo_pendiente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" "order_payment_status" DEFAULT 'sin_pago' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "advance_amount" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "balance_due" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "advance_payment_method" varchar(20);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "advance_reference_number" varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "advance_proof_image_id" uuid;

-- Add foreign key constraint if not exists
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_advance_proof_image_id_files_id_fk" 
    FOREIGN KEY ("advance_proof_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS "idx_orders_payment_status" ON "orders" USING btree ("business_id","payment_status");
