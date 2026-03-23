/**
 * Script to check PostgreSQL enum definitions
 * Run: bun run scripts/check-enums.ts
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  ssl: true,
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

const db = drizzle(client, { schema });

async function checkEnums() {
  console.log("🔍 Checking PostgreSQL enum definitions...\n");

  try {
    // Check purchase_status enum
    const purchaseStatusResult = await db.execute(
      sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'purchase_status'::regtype ORDER BY enumsortorder`
    );
    console.log("📋 purchase_status enum values:");
    purchaseStatusResult.forEach((row: any) => {
      console.log(`  - "${row.enumlabel}"`);
    });

    // Check sync_status enum
    const syncStatusResult = await db.execute(
      sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'sync_status'::regtype ORDER BY enumsortorder`
    );
    console.log("\n📋 sync_status enum values:");
    syncStatusResult.forEach((row: any) => {
      console.log(`  - "${row.enumlabel}"`);
    });

    // Check if there are any other custom enums
    const allEnumsResult = await db.execute(
      sql`SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values FROM pg_enum GROUP BY typname ORDER BY typname`
    );
    console.log("\n📋 All enums in database:");
    allEnumsResult.forEach((row: any) => {
      console.log(`  ${row.typname}: ${row.values}`);
    });

    // Compare with schema definitions
    console.log("\n📋 Schema definitions:");
    console.log("  purchase_status: draft, pending, received, cancelled");
    console.log("  sync_status: pending, synced, error");
    console.log("  purchase_status_enum: draft, pending, received, cancelled");

  } catch (error) {
    console.error("❌ Error checking enums:", error);
  } finally {
    await client.end();
  }
}

checkEnums();
