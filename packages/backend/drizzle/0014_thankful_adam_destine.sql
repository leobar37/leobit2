ALTER TABLE "closings" ADD COLUMN "backdate_reason" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "receipt_image_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_receipt_image_id_files_id_fk" FOREIGN KEY ("receipt_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_closings_business_seller_date" ON "closings" USING btree ("business_id","seller_id","closing_date");--> statement-breakpoint
CREATE INDEX "idx_purchases_receipt_image_id" ON "purchases" USING btree ("receipt_image_id");