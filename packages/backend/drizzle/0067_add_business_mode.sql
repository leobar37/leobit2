-- Add business mode and config overrides to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "business_mode" varchar(50) NOT NULL DEFAULT 'polleria';
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "mode_config_overrides" jsonb DEFAULT '{}';

-- Create index for business mode lookups
CREATE INDEX IF NOT EXISTS "idx_businesses_business_mode" ON "businesses" ("business_mode");
