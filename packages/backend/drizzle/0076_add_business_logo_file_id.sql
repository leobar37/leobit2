-- Add logo_file_id column to businesses table for file system architecture
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "logo_file_id" uuid;
CREATE INDEX IF NOT EXISTS "idx_businesses_logo_file_id" ON "businesses" ("logo_file_id");