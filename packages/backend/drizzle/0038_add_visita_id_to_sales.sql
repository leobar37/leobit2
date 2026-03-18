-- Add visita_id column to sales table for bidirectional relationship
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "visita_id" uuid;

-- Add foreign key constraint
ALTER TABLE "sales" ADD CONSTRAINT "sales_visita_id_visitas_id_fk" 
  FOREIGN KEY ("visita_id") REFERENCES "visitas"("id") 
  ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_sales_visita_id" ON "sales"("visita_id");