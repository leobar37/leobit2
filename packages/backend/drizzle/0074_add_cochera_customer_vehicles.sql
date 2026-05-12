CREATE TABLE IF NOT EXISTS "cochera_customer_vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "plate" varchar(20) NOT NULL,
  "vehicle_type" varchar(20) DEFAULT 'auto' NOT NULL,
  "alias" varchar(120),
  "notes" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "cochera_customer_vehicles"
  ADD CONSTRAINT "cochera_customer_vehicles_business_id_businesses_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cochera_customer_vehicles"
  ADD CONSTRAINT "cochera_customer_vehicles_customer_id_customers_id_fk"
  FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_cochera_customer_vehicles_business_id"
  ON "cochera_customer_vehicles" USING btree ("business_id");

CREATE INDEX IF NOT EXISTS "idx_cochera_customer_vehicles_customer_id"
  ON "cochera_customer_vehicles" USING btree ("customer_id");

CREATE INDEX IF NOT EXISTS "idx_cochera_customer_vehicles_plate"
  ON "cochera_customer_vehicles" USING btree ("plate");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_cochera_customer_vehicles_active_plate"
  ON "cochera_customer_vehicles" USING btree ("business_id", "plate")
  WHERE "active" = true;

ALTER TABLE "cochera_sessions"
  ADD COLUMN IF NOT EXISTS "customer_vehicle_id" uuid;

ALTER TABLE "cochera_sessions"
  ADD CONSTRAINT "cochera_sessions_customer_vehicle_id_cochera_customer_vehicles_id_fk"
  FOREIGN KEY ("customer_vehicle_id") REFERENCES "public"."cochera_customer_vehicles"("id") ON DELETE no action ON UPDATE no action;
