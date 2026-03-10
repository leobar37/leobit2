-- Make client_id nullable to allow draft orders without a customer assigned
ALTER TABLE orders ALTER COLUMN client_id DROP NOT NULL;
