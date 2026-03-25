-- Add expires_at column to sale_tokens
ALTER TABLE "sale_tokens" ADD COLUMN "expires_at" timestamp NOT NULL DEFAULT (NOW() + INTERVAL '7 days');

-- Add index for expiration queries
CREATE INDEX IF NOT EXISTS "idx_sale_tokens_expires_at" ON "sale_tokens" ("expires_at");

-- Update existing tokens to have expiration 7 days from their creation date
UPDATE "sale_tokens" SET "expires_at" = "created_at" + INTERVAL '7 days' WHERE "expires_at" IS NULL;
