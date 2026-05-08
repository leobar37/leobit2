CREATE TABLE IF NOT EXISTS "cochera_session_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "session_id" uuid NOT NULL REFERENCES "cochera_sessions"("id") ON DELETE cascade,
  "amount" numeric(10, 2) NOT NULL,
  "payment_method" "payment_method" NOT NULL DEFAULT 'efectivo',
  "reference_number" varchar(50),
  "proof_image_id" uuid REFERENCES "files"("id"),
  "notes" text,
  "collected_by" uuid REFERENCES "business_users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_business_id" ON "cochera_session_payments" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_session_id" ON "cochera_session_payments" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_payment_method" ON "cochera_session_payments" ("payment_method");
CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_proof_image_id" ON "cochera_session_payments" ("proof_image_id");
CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_collected_by" ON "cochera_session_payments" ("collected_by");
CREATE INDEX IF NOT EXISTS "idx_cochera_session_payments_created_at" ON "cochera_session_payments" ("created_at");
