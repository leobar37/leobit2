-- Create assets table (galería compartida)
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assets_business_id" ON "assets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_assets_created_at" ON "assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_assets_deleted_at" ON "assets" USING btree ("deleted_at");

-- Create files table (archivos privados)
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"filename" varchar(255) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_files_business_id" ON "files" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_files_created_at" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_files_deleted_at" ON "files" USING btree ("deleted_at");

-- Add image_id to products table
ALTER TABLE "products" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_id_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_products_image_id" ON "products" USING btree ("image_id");

-- Change avatar_url to avatar_id in user_profiles
ALTER TABLE "user_profiles" DROP COLUMN "avatar_url";--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_id_files_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_profiles_avatar_id" ON "user_profiles" USING btree ("avatar_id");

-- Change proof_image_url to proof_image_id in abonos
ALTER TABLE "abonos" DROP COLUMN "proof_image_url";--> statement-breakpoint
ALTER TABLE "abonos" ADD COLUMN "proof_image_id" uuid;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_proof_image_id_files_id_fk" FOREIGN KEY ("proof_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_abonos_proof_image_id" ON "abonos" USING btree ("proof_image_id");