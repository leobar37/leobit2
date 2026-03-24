/**
 * Debug script to test the purchase sync operation with transaction context
 * Run with: cd packages/backend && bun run scripts/debug-purchase-sync.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { purchases, purchaseItems, suppliers, products, productVariants, files } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const PURCHASE_ID = "2009989a-eca3-4ca1-b5fb-eee37a310266";
const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

async function debugPurchase() {
  console.log("🔍 Debugging purchase sync...\n");

  // Check purchase
  console.log("📋 Purchase data:");
  const purchaseResult = await db.select().from(purchases).where(
    and(eq(purchases.id, PURCHASE_ID), eq(purchases.businessId, BUSINESS_ID))
  );
  console.log("  Purchase:", JSON.stringify(purchaseResult, null, 2));

  // Check purchase items
  console.log("\n📋 Purchase items:");
  const itemsResult = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, PURCHASE_ID));
  console.log("  Items count:", itemsResult.length);
  for (const item of itemsResult) {
    console.log("  Item:", JSON.stringify(item, null, 2));
  }

  // Check what products exist for those items
  if (itemsResult.length > 0) {
    console.log("\n📋 Checking products referenced in items:");
    for (const item of itemsResult) {
      const productResult = await db.select().from(products).where(eq(products.id, item.productId));
      console.log(`  Product ${item.productId}:`, productResult.length > 0 ? "EXISTS" : "MISSING");

      if (item.variantId) {
        const variantResult = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId));
        console.log(`  Variant ${item.variantId}:`, variantResult.length > 0 ? "EXISTS" : "MISSING");
      }
    }
  }

  // Test the findById query using Drizzle's query builder
  console.log("\n📋 Testing Drizzle query (purchaseRepo.findById equivalent):");
  try {
    const result = await db.transaction(async (tx) => {
      const purchase = await tx.query.purchases.findFirst({
        where: and(
          eq(purchases.id, PURCHASE_ID),
          eq(purchases.businessId, BUSINESS_ID)
        ),
        with: {
          supplier: true,
          receiptImage: true,
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      return purchase;
    });
    console.log("  ✅ Drizzle query success!");
    console.log("  Result:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log("  ❌ Drizzle query failed!");
    console.log("  Error:", error?.message || error);
    console.log("  Code:", error?.code);
    console.log("  Routine:", error?.routine);
  }

  console.log("\n✅ Debug complete!");
  process.exit(0);
}

debugPurchase().catch(console.error);
