ALTER TABLE "cochera_settings"
  ADD COLUMN IF NOT EXISTS "hourly_billing_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "hourly_base_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "hourly_base_hours" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "extra_hour_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "default_payment_timing" varchar(20) DEFAULT 'exit' NOT NULL;

ALTER TABLE "cochera_sessions"
  ADD COLUMN IF NOT EXISTS "payment_timing" varchar(20),
  ADD COLUMN IF NOT EXISTS "entry_amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "entry_payment_method" varchar(20),
  ADD COLUMN IF NOT EXISTS "entry_payment_at" timestamp,
  ADD COLUMN IF NOT EXISTS "pricing_snapshot" jsonb;
