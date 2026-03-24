/**
 * Script to add sync_group_id column to purchase_items table
 * Run with: cd packages/backend && bun run scripts/fix-purchase-items-sync-group.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function fixPurchaseItems() {
  console.log("🔧 Adding sync_group_id column to purchase_items table...\n");

  try {
    // First check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'purchase_items' AND column_name = 'sync_group_id'
    `);

    const rows = checkResult as unknown as Array<{ column_name: string }>;

    if (rows.length > 0) {
      console.log("✅ Column sync_group_id already exists in purchase_items!");
      process.exit(0);
    }

    // Add the column
    await db.execute(sql`
      ALTER TABLE purchase_items
      ADD COLUMN sync_group_id varchar(100)
    `);

    console.log("✅ Successfully added sync_group_id column to purchase_items!");
    console.log("\n📋 Verifying...");

    // Verify the column was added
    const verifyResult = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'purchase_items' AND column_name = 'sync_group_id'
    `);

    const verifyRows = verifyResult as unknown as Array<{ column_name: string; data_type: string }>;
    if (verifyRows.length > 0) {
      console.log(`✅ Verified: ${verifyRows[0].column_name} (${verifyRows[0].data_type})`);
    }

  } catch (error: any) {
    console.log("❌ Error:", error?.message || error);
    if (error?.code) console.log("   PostgreSQL Error Code:", error.code);
    if (error?.detail) console.log("   Detail:", error.detail);
    process.exit(1);
  }

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

fixPurchaseItems().catch(console.error);
