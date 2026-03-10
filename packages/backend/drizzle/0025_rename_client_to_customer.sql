-- Migration: Rename client_id to customer_id in sales and payments tables
-- This standardizes the naming to use "customer" consistently across the codebase

-- Rename client_id to customer_id in sales table
ALTER TABLE sales RENAME COLUMN client_id TO customer_id;

-- Rename client_id to customer_id in payments table (abonos)
ALTER TABLE abonos RENAME COLUMN client_id TO customer_id;

-- Update indexes (they will be automatically renamed by PostgreSQL, but let's document)
-- The index idx_sales_client_id becomes idx_sales_customer_id
-- The index idx_abonos_client_id becomes idx_abonos_customer_id

-- Add comments for clarity
COMMENT ON COLUMN sales.customer_id IS 'Reference to the customer who made the purchase';
COMMENT ON COLUMN abonos.customer_id IS 'Reference to the customer who made the payment';
