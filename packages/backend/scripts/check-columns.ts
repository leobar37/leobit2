/**
 * Script to check if database columns match Drizzle schema definitions
 * Run with: cd packages/backend && bun run scripts/check-columns.ts
 */

import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function checkColumns() {
  console.log("🔍 Checking database schema columns...\n");

  const tables = [
    "products",
    "product_variants",
    "suppliers",
    "files",
    "purchases",
    "purchase_items",
  ];

  for (const tableName of tables) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log("─".repeat(50));

    try {
      const result = await db.execute(sql`SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = ${tableName} AND table_schema = 'public'
         ORDER BY ordinal_position`);

      const rows = result as unknown as Array<{ column_name: string; data_type: string }>;

      if (!rows || rows.length === 0) {
        console.log("  ❌ Table does not exist!");
        continue;
      }

      console.log("  Columns in database:");
      for (const row of rows) {
        console.log(`    - ${row.column_name}: ${row.data_type}`);
      }

      // Check for sync_status column
      const hasSyncStatus = rows.some(r => r.column_name === "sync_status");
      const hasSyncAttempts = rows.some(r => r.column_name === "sync_attempts");
      const hasSyncGroupId = rows.some(r => r.column_name === "sync_group_id");

      console.log(`\n  Sync columns:`);
      console.log(`    sync_status: ${hasSyncStatus ? "✅" : "❌ MISSING"}`);
      console.log(`    sync_attempts: ${hasSyncAttempts ? "✅" : "❌ MISSING"}`);
      console.log(`    sync_group_id: ${hasSyncGroupId ? "✅" : "❌ MISSING"}`);

    } catch (error) {
      console.log(`  ❌ Error querying table: ${error}`);
    }
  }

  console.log("\n\n🔍 Checking product_variants columns for lateral join...\n");

  try {
    const variantResult = await db.execute(sql`SELECT column_name FROM information_schema.columns
       WHERE table_name = 'product_variants' AND table_schema = 'public'`) as unknown as Array<{ column_name: string }>;

    const variantColumnNames = variantResult.map(r => r.column_name);

    console.log("product_variants columns:");
    for (const col of variantColumnNames) {
      console.log(`  - ${col}`);
    }

    const requiredVariantColumns = ["id", "product_id", "business_id", "name", "sku", "unit_quantity", "price", "cost_price", "sort_order", "is_active", "sync_status", "sync_attempts", "created_at", "updated_at"];

    console.log("\n  Required columns for lateral join:");
    for (const col of requiredVariantColumns) {
      console.log(`    ${col}: ${variantColumnNames.includes(col) ? "✅" : "❌ MISSING"}`);
    }

  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }

  console.log("\n✅ Check complete!");
  process.exit(0);
}

checkColumns().catch(console.error);
