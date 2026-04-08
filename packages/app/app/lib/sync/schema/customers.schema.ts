/**
 * Customers Schema
 */

export const SCHEMA_NAME = "customers";

export const CREATE_CUSTOMERS_TABLE = `
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  dni VARCHAR(20),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  business_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_CUSTOMERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
`.trim();
