-- Migration: Fix product_variants.business_id to be NOT NULL
-- This ensures variants sync correctly via ElectricSQL

-- Step 1: Update all variants to have the business_id from their parent product
UPDATE product_variants pv
SET business_id = p.business_id
FROM products p
WHERE pv.product_id = p.id
  AND pv.business_id IS NULL;

-- Step 2: Verify all variants now have business_id
-- (This query is for verification only, won't fail the migration)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM product_variants
  WHERE business_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % variants with NULL business_id. Please fix manually.', null_count;
  END IF;
END $$;

-- Step 3: Add NOT NULL constraint
ALTER TABLE product_variants ALTER COLUMN business_id SET NOT NULL;

-- Step 4: Refresh Electric publication to pick up schema change
-- (Electric will detect this automatically on next sync)
