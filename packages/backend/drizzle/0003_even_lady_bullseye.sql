CREATE TABLE "sync_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"operation_id" varchar(128) NOT NULL,
	"entity" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"error" text,
	"client_timestamp" timestamp NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sync_operations_business_id" ON "sync_operations" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_sync_operations_status" ON "sync_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_operations_processed_at" ON "sync_operations" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sync_operations_business_operation" ON "sync_operations" USING btree ("business_id","operation_id");