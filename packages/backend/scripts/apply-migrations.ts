/// Apply missing migrations directly to database
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function applyMigrations() {
  console.log("Applying missing migrations...");

  try {
    // Migration 0041: Add sync_group_id columns
    console.log("Applying 0041_add_sync_group_ids...");
    await db.execute(sql`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(100)
    `);
    await db.execute(sql`
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS sync_group_id VARCHAR(128)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sales_sync_group_id ON sales(sync_group_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_operations_sync_group_id ON sync_operations(sync_group_id)
    `);
    console.log("✓ 0041_add_sync_group_ids applied");

    // Migration 0042: Create sync_conflicts table
    console.log("Applying 0042_create_sync_conflicts...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        operation_id VARCHAR(128) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(128) NOT NULL,
        local_data JSONB NOT NULL,
        server_data JSONB NOT NULL,
        local_version INTEGER NOT NULL,
        server_version INTEGER NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        resolution VARCHAR(32),
        resolved_by UUID REFERENCES business_users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_business_id ON sync_conflicts(business_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created_at ON sync_conflicts(created_at)
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_conflicts_operation ON sync_conflicts(business_id, operation_id)
    `);
    console.log("✓ 0042_create_sync_conflicts applied");

    console.log("\n✅ All migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigrations();