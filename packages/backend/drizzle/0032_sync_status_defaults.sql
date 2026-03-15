ALTER TABLE customers ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE customers SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE suppliers ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE suppliers SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE tags ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE tags SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE customer_tags ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE customer_tags SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE sales ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE sales SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE abonos ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE abonos SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE closings ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE closings SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE files ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE files SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE purchases ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE purchases SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE purchase_items ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE purchase_items SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE distribuciones ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE distribuciones SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';

ALTER TABLE distribucion_items ALTER COLUMN sync_status SET DEFAULT 'synced';
UPDATE distribucion_items SET sync_status = 'synced', sync_attempts = 0 WHERE sync_status = 'pending';