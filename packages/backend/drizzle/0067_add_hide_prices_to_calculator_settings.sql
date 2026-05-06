-- Migration: Add hidePrices flag to existing calculator_settings JSONB
-- Backfills hidePrices: false into all existing business calculator configs

UPDATE businesses
SET calculator_settings = jsonb_set(
  calculator_settings,
  '{calculators,sales,hidePrices}',
  'false'::jsonb,
  true
)
WHERE calculator_settings->'calculators'->'sales'->'hidePrices' IS NULL;

UPDATE businesses
SET calculator_settings = jsonb_set(
  calculator_settings,
  '{calculators,orders,hidePrices}',
  'false'::jsonb,
  true
)
WHERE calculator_settings->'calculators'->'orders'->'hidePrices' IS NULL;

UPDATE businesses
SET calculator_settings = jsonb_set(
  calculator_settings,
  '{calculators,purchases,hidePrices}',
  'false'::jsonb,
  true
)
WHERE calculator_settings->'calculators'->'purchases'->'hidePrices' IS NULL;
