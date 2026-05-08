CREATE TABLE IF NOT EXISTS "water_routes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "name" varchar(120) NOT NULL,
  "zone" varchar(160),
  "description" text,
  "is_active" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_water_routes_business_id"
  ON "water_routes" ("business_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_water_routes_business_name"
  ON "water_routes" ("business_id", "name");

CREATE TABLE IF NOT EXISTS "water_customer_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "delivery_frequency" varchar(40) NOT NULL DEFAULT 'weekly',
  "delivery_days" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "default_container_quantity" integer NOT NULL DEFAULT 1,
  "containers_at_customer" integer NOT NULL DEFAULT 0,
  "deposit_amount" numeric(10, 2) NOT NULL DEFAULT '0',
  "deposit_status" varchar(30) NOT NULL DEFAULT 'none',
  "deposit_exception_reason" text,
  "water_route_id" uuid REFERENCES "water_routes"("id") ON DELETE set null,
  "preferred_route" varchar(120),
  "delivery_instructions" text,
  "schedule_anchor_date" timestamp,
  "last_scheduled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_water_customer_profiles_business_customer"
  ON "water_customer_profiles" ("business_id", "customer_id");
CREATE INDEX IF NOT EXISTS "idx_water_customer_profiles_business_id"
  ON "water_customer_profiles" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_water_customer_profiles_customer_id"
  ON "water_customer_profiles" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_water_customer_profiles_water_route_id"
  ON "water_customer_profiles" ("water_route_id");
CREATE INDEX IF NOT EXISTS "idx_water_customer_profiles_preferred_route"
  ON "water_customer_profiles" ("business_id", "preferred_route");

CREATE TABLE IF NOT EXISTS "water_delivery_stops" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "visita_id" uuid NOT NULL REFERENCES "visitas"("id") ON DELETE cascade,
  "customer_profile_id" uuid NOT NULL REFERENCES "water_customer_profiles"("id") ON DELETE cascade,
  "water_route_id" uuid REFERENCES "water_routes"("id") ON DELETE set null,
  "scheduled_date" varchar(10) NOT NULL,
  "expected_container_quantity" integer NOT NULL DEFAULT 1,
  "containers_at_start" integer NOT NULL DEFAULT 0,
  "delivered_container_quantity" integer NOT NULL DEFAULT 0,
  "collected_container_quantity" integer NOT NULL DEFAULT 0,
  "damaged_container_quantity" integer NOT NULL DEFAULT 0,
  "lost_container_quantity" integer NOT NULL DEFAULT 0,
  "status" varchar(30) NOT NULL DEFAULT 'pendiente',
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_water_delivery_stops_visita"
  ON "water_delivery_stops" ("visita_id");
CREATE INDEX IF NOT EXISTS "idx_water_delivery_stops_business_id"
  ON "water_delivery_stops" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_water_delivery_stops_visita_id"
  ON "water_delivery_stops" ("visita_id");
CREATE INDEX IF NOT EXISTS "idx_water_delivery_stops_profile_id"
  ON "water_delivery_stops" ("customer_profile_id");
CREATE INDEX IF NOT EXISTS "idx_water_delivery_stops_route_date"
  ON "water_delivery_stops" ("business_id", "water_route_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS "idx_water_delivery_stops_status"
  ON "water_delivery_stops" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_water_delivery_stops_profile_route_date"
  ON "water_delivery_stops" ("business_id", "customer_profile_id", "water_route_id", "scheduled_date");

CREATE TABLE IF NOT EXISTS "water_container_ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "customer_profile_id" uuid NOT NULL REFERENCES "water_customer_profiles"("id") ON DELETE cascade,
  "visita_id" uuid REFERENCES "visitas"("id") ON DELETE set null,
  "entry_type" varchar(30) NOT NULL,
  "quantity" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reason" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_water_container_ledger_business_id"
  ON "water_container_ledger_entries" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_water_container_ledger_customer_id"
  ON "water_container_ledger_entries" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_water_container_ledger_profile_id"
  ON "water_container_ledger_entries" ("customer_profile_id");
CREATE INDEX IF NOT EXISTS "idx_water_container_ledger_created_at"
  ON "water_container_ledger_entries" ("created_at");

CREATE TABLE IF NOT EXISTS "water_deposit_ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "customer_profile_id" uuid NOT NULL REFERENCES "water_customer_profiles"("id") ON DELETE cascade,
  "entry_type" varchar(30) NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "balance_after" numeric(10, 2) NOT NULL,
  "reason" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_water_deposit_ledger_business_id"
  ON "water_deposit_ledger_entries" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_water_deposit_ledger_customer_id"
  ON "water_deposit_ledger_entries" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_water_deposit_ledger_profile_id"
  ON "water_deposit_ledger_entries" ("customer_profile_id");
CREATE INDEX IF NOT EXISTS "idx_water_deposit_ledger_created_at"
  ON "water_deposit_ledger_entries" ("created_at");
