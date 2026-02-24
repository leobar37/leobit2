-- Add business_id column to products table
-- This aligns the database schema with the Drizzle schema definition

-- First, delete any existing products (they need to be recreated with proper business_id)
DELETE FROM "products";

-- Add business_id column
ALTER TABLE "products" ADD COLUMN "business_id" uuid NOT NULL;

-- Add foreign key constraint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" 
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") 
  ON DELETE cascade ON UPDATE no action;

-- Create index for business_id lookups
CREATE INDEX "idx_products_business_id" ON "products" USING btree ("business_id");
