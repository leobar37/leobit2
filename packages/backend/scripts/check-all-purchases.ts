/**
 * Script to check ALL purchases in the database (no business filter)
 * Run with: cd packages/backend && bun run scripts/check-all-purchases.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { purchases } from "../src/db/schema";

async function checkAllPurchases() {
  console.log("🔍 Checking ALL purchases in database...\n");

  try {
    const allPurchases = await db.execute(sql`SELECT id, business_id, supplier_id, total_amount, status, sync_status FROM purchases`);

    const rows = allPurchases as unknown as Array<{
      id: string;
      business_id: string;
      supplier_id: string | null;
      total_amount: string;
      status: string;
      sync_status: string;
    }>;

    console.log(`📋 Found ${rows.length} total purchases\n`);

    for (const p of rows) {
      console.log(`  - ID: ${p.id}`);
      console.log(`    Business: ${p.business_id}`);
      console.log(`    Total: ${p.total_amount}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Sync: ${p.sync_status}`);
      console.log();
    }

  } catch (error: any) {
    console.log("❌ Error:", error?.message || error);
    if (error?.code) console.log("   PostgreSQL Error Code:", error.code);
    process.exit(1);
  }

  process.exit(0);
}

checkAllPurchases().catch(console.error);
