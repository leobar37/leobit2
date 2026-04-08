/**
 * Customer Groups Schema
 */

export const SCHEMA_NAME = "customer_groups";

export const CREATE_CUSTOMER_GROUPS_TABLE = `
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  business_id UUID NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_CUSTOMER_GROUPS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customer_groups_business_id ON customer_groups(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_groups_name ON customer_groups(name);
`.trim();
