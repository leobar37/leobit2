/**
 * Script to check purchase totals for a specific business
 * Run with: cd packages/backend && bun run scripts/check-purchase-totals.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { purchases, purchaseItems } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

async function checkPurchaseTotals() {
  console.log("🔍 Checking purchase totals...\n");
  console.log(`Business ID: ${BUSINESS_ID}\n`);

  try {
    // Get all purchases for this business
    const allPurchases = await db.select().from(purchases).where(eq(purchases.businessId, BUSINESS_ID));

    console.log(`📋 Found ${allPurchases.length} purchases for this business\n`);

    let zeroTotalWithItemsCount = 0;

    for (const purchase of allPurchases) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`Purchase ID: ${purchase.id}`);
      console.log(`Status: ${purchase.status}`);
      console.log(`Total Amount (in purchase): ${purchase.totalAmount}`);
      console.log(`Purchase Date: ${purchase.purchaseDate}`);

      // Get items for this purchase
      const items = await db.execute(sql`
        SELECT id, product_id, variant_id, quantity, unit_cost, total_cost
        FROM purchase_items
        WHERE purchase_id = ${purchase.id}
      `);

      const itemRows = items as unknown as Array<{
        id: string;
        product_id: string;
        variant_id: string | null;
        quantity: string;
        unit_cost: string;
        total_cost: string;
      }>;

      console.log(`\n  Items (${itemRows.length}):`);
      let calculatedTotal = 0;

      for (const item of itemRows) {
        const qty = parseFloat(item.quantity) || 0;
        const unitCost = parseFloat(item.unit_cost) || 0;
        const totalCost = parseFloat(item.total_cost) || 0;
        const expectedTotal = qty * unitCost;
        const matches = Math.abs(expectedTotal - totalCost) < 0.01;

        console.log(`    - Item ${item.id.slice(0, 8)}...`);
        console.log(`      quantity: ${item.quantity}, unit_cost: ${item.unit_cost}, total_cost: ${item.total_cost}`);
        console.log(`      Expected total: ${expectedTotal.toFixed(2)}, Matches: ${matches ? "✅" : "❌"}`);

        calculatedTotal += totalCost;
      }

      console.log(`\n  Calculated total from items: ${calculatedTotal.toFixed(2)}`);
      console.log(`  Total in purchase record: ${purchase.totalAmount}`);

      const diff = Math.abs(parseFloat(purchase.totalAmount as string) - calculatedTotal);
      if (diff < 0.01) {
        console.log(`  ✅ TOTALS MATCH`);
      } else {
        console.log(`  ❌ TOTALS DON'T MATCH! Difference: ${diff.toFixed(2)}`);
      }

      const hasItems = itemRows.length > 0;
      const isZeroTotal = parseFloat(purchase.totalAmount as string) === 0;
      if (hasItems && isZeroTotal) {
        zeroTotalWithItemsCount++;
        console.log(`  ⚠️  WARNING: Has ${itemRows.length} items but total=0!`);
      }
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("📊 SUMMARY OF ISSUES\n");
    console.log(`Total purchases: ${allPurchases.length}`);
    console.log(`Purchases with items but zero total: ${zeroTotalWithItemsCount}`);

    if (zeroTotalWithItemsCount === 0) {
      console.log("\n✅ No total=0 issues found in existing purchases!");
    } else {
      console.log(`\n❌ Found ${zeroTotalWithItemsCount} purchases with items but zero total!`);
    }

  } catch (error: any) {
    console.log("❌ Error:", error?.message || error);
    if (error?.code) console.log("   PostgreSQL Error Code:", error.code);
    process.exit(1);
  }

  console.log("\n✅ Check complete!");
  process.exit(0);
}

checkPurchaseTotals().catch(console.error);
