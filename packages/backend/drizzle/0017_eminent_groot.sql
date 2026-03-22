CREATE TABLE IF NOT EXISTS "business_user_whatsapp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"is_connected" boolean DEFAULT false NOT NULL,
	"phone_number" varchar(20),
	"instance_name" varchar(100),
	"qr_code" text,
	"qr_code_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_user_whatsapp_settings_business_user_id_unique" UNIQUE("business_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_tags" (
	"customer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	CONSTRAINT "customer_tags_customer_id_tag_id_pk" PRIMARY KEY("customer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"token" varchar(12) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "order_tokens_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20) DEFAULT '#f97316' NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
-- orders table was renamed to sales in migration 0023_unify_sales_orders
-- ALTER TABLE "orders" ADD COLUMN "allow_customer_edit" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_user_whatsapp_settings" ADD CONSTRAINT "business_user_whatsapp_settings_business_user_id_business_users_id_fk" FOREIGN KEY ("business_user_id") REFERENCES "public"."business_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_user_whatsapp_settings" ADD CONSTRAINT "business_user_whatsapp_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_assigned_by_business_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tokens" ADD CONSTRAINT "order_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_business_user_id_business_users_id_fk" FOREIGN KEY ("business_user_id") REFERENCES "public"."business_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_whatsapp_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_business_user_id_business_users_id_fk" FOREIGN KEY ("business_user_id") REFERENCES "public"."business_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_whatsapp_settings_business_user_id" ON "business_user_whatsapp_settings" USING btree ("business_user_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_settings_business_id" ON "business_user_whatsapp_settings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_customer_id" ON "customer_tags" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_tag_id" ON "customer_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_order_tokens_token" ON "order_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_tags_business_id" ON "tags" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_tags_name" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_business_user_id" ON "whatsapp_messages" USING btree ("business_user_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_business_id" ON "whatsapp_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_customer_id" ON "whatsapp_messages" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_status" ON "whatsapp_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_sent_at" ON "whatsapp_messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_templates_business_user_id" ON "whatsapp_templates" USING btree ("business_user_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_templates_business_id" ON "whatsapp_templates" USING btree ("business_id");