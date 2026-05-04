-- Add payment_method column to sales table for tracking payment method on partial payments
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_method" "payment_method";
