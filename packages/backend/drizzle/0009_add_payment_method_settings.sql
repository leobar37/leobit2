CREATE TABLE IF NOT EXISTS "business_payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"methods" jsonb DEFAULT '{"efectivo":{"enabled":true},"yape":{"enabled":false},"plin":{"enabled":false},"transferencia":{"enabled":false},"tarjeta":{"enabled":false}}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_payment_settings_business_id_unique" UNIQUE("business_id")
);

ALTER TABLE "business_payment_settings" ADD CONSTRAINT "business_payment_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade;

CREATE INDEX IF NOT EXISTS "idx_business_payment_settings_business_id" ON "business_payment_settings" USING btree ("business_id");
