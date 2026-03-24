-- Alter FK constraint on visitas.sale_id to SET NULL on delete
-- This allows deleting a sale without breaking the visita reference

-- Drop existing constraint
ALTER TABLE visitas DROP CONSTRAINT IF EXISTS visitas_sale_id_sales_id_fk;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE visitas ADD CONSTRAINT visitas_sale_id_sales_id_fk 
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;