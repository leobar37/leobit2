-- Add missing columns to distribuciones table
ALTER TABLE "distribuciones" 
  ADD COLUMN IF NOT EXISTS "modo" varchar(20) NOT NULL DEFAULT 'estricto',
  ADD COLUMN IF NOT EXISTS "confiar_en_vendedor" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "peso_confirmado" boolean NOT NULL DEFAULT true;

-- Add index for modo column if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_distribuciones_modo" ON "distribuciones" USING btree ("modo");
