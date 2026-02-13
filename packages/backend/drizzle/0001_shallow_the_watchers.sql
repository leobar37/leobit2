CREATE TABLE "closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"closing_date" date NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cash_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_kilos" numeric(10, 3),
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "closings" ADD CONSTRAINT "closings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closings" ADD CONSTRAINT "closings_seller_id_business_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."business_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_closings_business_id" ON "closings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_closings_seller_id" ON "closings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_closings_date" ON "closings" USING btree ("closing_date");--> statement-breakpoint
CREATE INDEX "idx_closings_sync_status" ON "closings" USING btree ("sync_status");