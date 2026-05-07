CREATE TABLE IF NOT EXISTS "distribucion_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"distribucion_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribucion_groups" ADD CONSTRAINT "distribucion_groups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribucion_groups" ADD CONSTRAINT "distribucion_groups_distribucion_id_distribuciones_id_fk" FOREIGN KEY ("distribucion_id") REFERENCES "public"."distribuciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribucion_groups" ADD CONSTRAINT "distribucion_groups_group_id_customer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distribucion_groups_business_id" ON "distribucion_groups" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distribucion_groups_distribucion_id" ON "distribucion_groups" USING btree ("distribucion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distribucion_groups_group_id" ON "distribucion_groups" USING btree ("group_id");
