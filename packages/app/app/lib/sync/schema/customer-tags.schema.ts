/**
 * Customer Tags Schema
 */

export const SCHEMA_NAME = "customer_tags";

export const CREATE_CUSTOMER_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS customer_tags (
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, customer_id, tag_id)
);
`.trim();

export const CREATE_CUSTOMER_TAGS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customer_tags_business_id ON customer_tags(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON customer_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_sync_status ON customer_tags(sync_status);
`.trim();
