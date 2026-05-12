ALTER TABLE "cochera_settings"
ADD COLUMN IF NOT EXISTS "vehicle_types" jsonb NOT NULL DEFAULT
'[
  {"id":"auto","label":"Auto","enabled":true,"isDefault":true},
  {"id":"moto","label":"Moto","enabled":true,"isDefault":true},
  {"id":"camioneta","label":"Camioneta","enabled":true,"isDefault":true},
  {"id":"mototaxi","label":"Mototaxi","enabled":true,"isDefault":true},
  {"id":"motolineal","label":"Motolineal","enabled":true,"isDefault":true}
]'::jsonb;
