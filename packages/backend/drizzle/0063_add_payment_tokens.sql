CREATE TABLE "payment_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"token" varchar(12) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "payment_tokens_payment_id_unique" UNIQUE("payment_id"),
	CONSTRAINT "payment_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "payment_tokens" ADD CONSTRAINT "payment_tokens_payment_id_abonos_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."abonos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_payment_tokens_token" ON "payment_tokens" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "idx_payment_tokens_payment_id" ON "payment_tokens" USING btree ("payment_id");
--> statement-breakpoint
CREATE INDEX "idx_payment_tokens_is_active" ON "payment_tokens" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "idx_payment_tokens_expires_at" ON "payment_tokens" USING btree ("expires_at");
