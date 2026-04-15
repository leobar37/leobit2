-- Migration: Make seller_id optional in sales and abonos tables
-- Created: 2026-04-15

-- Make seller_id optional in sales table
ALTER TABLE "sales" ALTER COLUMN "seller_id" DROP NOT NULL;

-- Make seller_id optional in abonos table  
ALTER TABLE "abonos" ALTER COLUMN "seller_id" DROP NOT NULL;
