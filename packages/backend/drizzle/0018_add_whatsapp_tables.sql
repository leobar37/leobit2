-- Migration: add_whatsapp_tables
-- Created: 2026-03-07
-- Description: Add WhatsApp integration tables

-- Table: business_user_whatsapp_settings
CREATE TABLE IF NOT EXISTS "business_user_whatsapp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"is_connected" boolean DEFAULT false NOT NULL,
	"phone_number" varchar(20),
	"instance_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Table: whatsapp_templates
CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Table: whatsapp_messages
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"template_id" uuid,
	"phone_number" varchar(20) NOT NULL,
	"message_content" text NOT NULL,
	"status" varchar(20) DEFAULT 'enviado' NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for business_user_whatsapp_settings
CREATE INDEX IF NOT EXISTS "idx_whatsapp_settings_business_user_id" ON "business_user_whatsapp_settings" USING btree ("business_user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_settings_business_id" ON "business_user_whatsapp_settings" USING btree ("business_id");

-- Indexes for whatsapp_templates
CREATE INDEX IF NOT EXISTS "idx_whatsapp_templates_business_user_id" ON "whatsapp_templates" USING btree ("business_user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_templates_business_id" ON "whatsapp_templates" USING btree ("business_id");

-- Indexes for whatsapp_messages
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_business_user_id" ON "whatsapp_messages" USING btree ("business_user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_business_id" ON "whatsapp_messages" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_customer_id" ON "whatsapp_messages" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_status" ON "whatsapp_messages" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_sent_at" ON "whatsapp_messages" USING btree ("sent_at");

-- Foreign Keys for business_user_whatsapp_settings
ALTER TABLE "business_user_whatsapp_settings" 
	ADD CONSTRAINT "fk_whatsapp_settings_business_user" 
	FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE cascade;

ALTER TABLE "business_user_whatsapp_settings" 
	ADD CONSTRAINT "fk_whatsapp_settings_business" 
	FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;

-- Foreign Keys for whatsapp_templates
ALTER TABLE "whatsapp_templates" 
	ADD CONSTRAINT "fk_templates_business_user" 
	FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE cascade;

ALTER TABLE "whatsapp_templates" 
	ADD CONSTRAINT "fk_templates_business" 
	FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;

-- Foreign Keys for whatsapp_messages
ALTER TABLE "whatsapp_messages" 
	ADD CONSTRAINT "fk_messages_business_user" 
	FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE cascade;

ALTER TABLE "whatsapp_messages" 
	ADD CONSTRAINT "fk_messages_business" 
	FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;

ALTER TABLE "whatsapp_messages" 
	ADD CONSTRAINT "fk_messages_customer" 
	FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade;

ALTER TABLE "whatsapp_messages" 
	ADD CONSTRAINT "fk_messages_template" 
	FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE set null;

-- Unique constraint for business_user_whatsapp_settings
ALTER TABLE "business_user_whatsapp_settings" 
	ADD CONSTRAINT "unique_whatsapp_settings_business_user" 
	UNIQUE ("business_user_id");