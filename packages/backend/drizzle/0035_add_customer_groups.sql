-- Customer Groups Schema
-- Groups for organizing customers (e.g., "VIP Customers", "Restaurant Owners")

-- Create customer_groups table
CREATE TABLE IF NOT EXISTS "customer_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "sync_status" "sync_status" NOT NULL DEFAULT 'synced',
  "sync_attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for customer_groups
CREATE INDEX IF NOT EXISTS "idx_customer_groups_business_id" ON "customer_groups"("business_id");
CREATE INDEX IF NOT EXISTS "idx_customer_groups_name" ON "customer_groups"("name");

-- Create customer_group_members table (junction table)
CREATE TABLE IF NOT EXISTS "customer_group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" uuid NOT NULL REFERENCES "customer_groups"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "added_at" timestamp NOT NULL DEFAULT NOW(),
  "added_by" uuid REFERENCES "business_users"("id"),
  "sync_status" "sync_status" NOT NULL DEFAULT 'synced',
  "sync_attempts" integer NOT NULL DEFAULT 0
);

-- Create indexes for customer_group_members
CREATE INDEX IF NOT EXISTS "idx_customer_group_members_group_id" ON "customer_group_members"("group_id");
CREATE INDEX IF NOT EXISTS "idx_customer_group_members_customer_id" ON "customer_group_members"("customer_id");

-- Add foreign key for business_id in customer_group_members (via group)
-- This is implicit through the group -> business relationship
