-- Migration: Add cierre fields to distribuciones table
-- This migration adds the closing/financial data fields that were previously in the closings table

-- Add cierre fields to distribuciones table
ALTER TABLE "distribuciones"
ADD COLUMN IF NOT EXISTS "total_sales" INTEGER,
ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "cash_amount" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "credit_amount" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "total_kilos" DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "closed_by" UUID REFERENCES "business_users"("id");

-- Create index for closed_at
CREATE INDEX IF NOT EXISTS "idx_distribuciones_closed_at" ON "distribuciones"("closed_at");

-- Note: The closings table will be dropped in a separate migration after data migration
-- to ensure no data is lost during the transition.
