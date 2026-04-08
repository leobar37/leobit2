/**
 * Customer Group Members Schema
 */

export const SCHEMA_NAME = "customer_group_members";

export const CREATE_CUSTOMER_GROUP_MEMBERS_TABLE = `
CREATE TABLE IF NOT EXISTS customer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  group_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export const CREATE_CUSTOMER_GROUP_MEMBERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customer_group_members_business_id ON customer_group_members(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_group_id ON customer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_customer_id ON customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_sync_status ON customer_group_members(sync_status);
`.trim();
