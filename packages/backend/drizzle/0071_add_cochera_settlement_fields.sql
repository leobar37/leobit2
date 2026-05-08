ALTER TABLE "cochera_sessions"
  ADD COLUMN IF NOT EXISTS "payment_mode" varchar(20),
  ADD COLUMN IF NOT EXISTS "amount_paid" numeric(10, 2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "balance_due" numeric(10, 2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "responsible_customer_id" uuid REFERENCES "customers"("id"),
  ADD COLUMN IF NOT EXISTS "responsible_name" varchar(160),
  ADD COLUMN IF NOT EXISTS "responsible_phone" varchar(40),
  ADD COLUMN IF NOT EXISTS "settlement_notes" text;
