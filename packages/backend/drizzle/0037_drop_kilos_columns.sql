-- Drop kilosAsignados, kilosVendidos, confiarEnVendedor, pesoConfirmado from distribuciones table
-- These columns are no longer needed as distribution items track quantities individually

ALTER TABLE distribuciones DROP COLUMN IF EXISTS kilos_asignados;
ALTER TABLE distribuciones DROP COLUMN IF EXISTS kilos_vendidos;
ALTER TABLE distribuciones DROP COLUMN IF EXISTS confiar_en_vendedor;
ALTER TABLE distribuciones DROP COLUMN IF EXISTS peso_confirmado;
