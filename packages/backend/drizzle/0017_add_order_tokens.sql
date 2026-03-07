-- Migration: 0017_add_order_tokens
-- Created: 2026-03-07

CREATE TABLE "order_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
  "token" varchar(12) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_used_at" timestamp
);

CREATE INDEX "idx_order_tokens_token" ON "order_tokens"("token");
