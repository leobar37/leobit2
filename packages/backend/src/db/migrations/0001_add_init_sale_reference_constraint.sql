-- Migration: Add unique constraint for initial sale payment references
-- Prevents duplicate initial abonos when creating credit sales with partial payments
-- Created: 2026-03-06

-- Add unique constraint on referenceNumber for init-sale references
-- This prevents race conditions where duplicate initial abonos could be created
ALTER TABLE abonos 
ADD CONSTRAINT unique_init_sale_reference 
UNIQUE (reference_number) 
WHERE reference_number LIKE 'init-sale:%';

-- Create index for faster lookup of init-sale references
CREATE INDEX idx_abonos_init_sale_reference 
ON abonos (reference_number) 
WHERE reference_number LIKE 'init-sale:%';

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_init_sale_reference ON abonos IS 
'Prevents duplicate initial payments when creating credit sales with partial payment (a cuenta)';
