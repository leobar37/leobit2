ALTER TABLE "distribuciones"
ADD COLUMN IF NOT EXISTS "nota_creacion" text,
ADD COLUMN IF NOT EXISTS "nota_cierre" text;
