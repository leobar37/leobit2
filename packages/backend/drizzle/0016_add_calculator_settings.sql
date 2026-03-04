-- Migration: Add calculator_settings JSONB column to businesses table
-- This stores per-business calculator configuration

ALTER TABLE businesses 
ADD COLUMN calculator_settings jsonb DEFAULT '{
  "calculators": {
    "sales": { "hideTara": true, "autoFillPrice": false },
    "orders": { "hideTara": true, "autoFillPrice": false },
    "purchases": { "hideTara": true, "autoFillPrice": false }
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN businesses.calculator_settings IS 'JSONB configuration for calculator behavior per business. Structure: { calculators: { sales: { hideTara: boolean, autoFillPrice: boolean }, orders: {...}, purchases: {...} } }';
