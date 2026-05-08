CREATE TABLE IF NOT EXISTS "business_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "plan" varchar(20) NOT NULL DEFAULT 'gratis',
  "monthly_record_limit" integer,
  "price_monthly" numeric(10, 2) NOT NULL DEFAULT '0',
  "features" jsonb DEFAULT '{"reports":false,"exportExcel":false}'::jsonb,
  "current_period_start" timestamp NOT NULL DEFAULT now(),
  "current_period_end" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_business_subscriptions_business_id"
  ON "business_subscriptions" ("business_id");

CREATE TABLE IF NOT EXISTS "subscription_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "period_start" timestamp NOT NULL DEFAULT now(),
  "period_end" timestamp NOT NULL DEFAULT now(),
  "record_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_subscription_usage_business_id"
  ON "subscription_usage" ("business_id");

CREATE TABLE IF NOT EXISTS "cochera_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "display_name" varchar(120),
  "display_address" text,
  "hourly_rate" numeric(10, 2) NOT NULL DEFAULT '0',
  "daily_rate" numeric(10, 2),
  "grace_minutes" integer NOT NULL DEFAULT 0,
  "total_spaces" integer NOT NULL DEFAULT 0,
  "accepted_payment_methods" jsonb NOT NULL DEFAULT '["efectivo"]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "cochera_settings_business_id_unique" UNIQUE ("business_id")
);

CREATE INDEX IF NOT EXISTS "idx_cochera_settings_business_id"
  ON "cochera_settings" ("business_id");

CREATE TABLE IF NOT EXISTS "cochera_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "plate" varchar(20) NOT NULL,
  "vehicle_type" varchar(20) NOT NULL DEFAULT 'auto',
  "status" varchar(20) NOT NULL DEFAULT 'dentro',
  "entry_at" timestamp NOT NULL DEFAULT now(),
  "exit_at" timestamp,
  "notes" text,
  "total_amount" numeric(10, 2),
  "discount_amount" numeric(10, 2),
  "payment_method" varchar(20),
  "checkout_at" timestamp,
  "checkout_by" uuid,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cochera_sessions_business_id"
  ON "cochera_sessions" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_cochera_sessions_status"
  ON "cochera_sessions" ("status");
CREATE INDEX IF NOT EXISTS "idx_cochera_sessions_plate"
  ON "cochera_sessions" ("plate");
CREATE INDEX IF NOT EXISTS "idx_cochera_sessions_entry_at"
  ON "cochera_sessions" ("entry_at");
CREATE INDEX IF NOT EXISTS "idx_cochera_sessions_active_plate"
  ON "cochera_sessions" ("business_id", "plate", "status");
