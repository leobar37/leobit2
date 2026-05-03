-- Migration: Add public catalog settings to businesses
-- Date: 2026-05-02

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS public_catalog_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS public_catalog_slug VARCHAR(100);

UPDATE businesses
SET public_catalog_slug = left(
  coalesce(
    nullif(trim(both '-' from regexp_replace(lower(coalesce(name, 'catalogo')), '[^a-z0-9]+', '-', 'g')), ''),
    'catalogo'
  ) || '-' || substring(id::text from 1 for 8),
  100
)
WHERE public_catalog_slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_businesses_public_catalog_slug_ci
  ON businesses (lower(public_catalog_slug));
