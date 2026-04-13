/**
 * Backfill Abono Seller ID
 *
 * Backfills missing seller_id values in the abonos table for historical data.
 * This script:
 * 1. Finds all abonos with null/empty seller_id
 * 2. Sets seller_id to the business owner or a system user
 *
 * Usage: cd packages/backend && bun run scripts/backfill-abono-seller-id.ts
 */

import { db } from "../src/lib/db";
import { abonos, businessUsers } from "../src/db/schema";
import { isNull, eq, and } from "drizzle-orm";

interface BackfillResult {
  totalChecked: number;
  backfilled: number;
  skipped: number;
  errors: string[];
}

async function backfillAbonoSellerId(): Promise<BackfillResult> {
  const result: BackfillResult = {
    totalChecked: 0,
    backfilled: 0,
    skipped: 0,
    errors: [],
  };

  console.log("🔍 Starting abono seller_id backfill...");

  try {
    // Find all abonos with null seller_id
    const abonosWithoutSeller = await db.query.abonos.findMany({
      where: isNull(abonos.sellerId),
    });

    console.log(`📊 Found ${abonosWithoutSeller.length} abonos without seller_id`);

    for (const abono of abonosWithoutSeller) {
      result.totalChecked++;

      // Find the first business user (owner) for this business
      const [businessUser] = await db
        .select()
        .from(businessUsers)
        .where(
          and(
            eq(businessUsers.businessId, abono.businessId),
            eq(businessUsers.role, "owner")
          )
        )
        .limit(1);

      if (!businessUser) {
        // Fallback: get any user from the business
        const [anyUser] = await db
          .select()
          .from(businessUsers)
          .where(eq(businessUsers.businessId, abono.businessId))
          .limit(1);

        if (!anyUser) {
          console.error(
            `❌ No business user found for business ${abono.businessId}, abono ${abono.id.slice(0, 8)}`
          );
          result.errors.push(`No business user: ${abono.id}`);
          continue;
        }

        await db
          .update(abonos)
          .set({ sellerId: anyUser.id })
          .where(eq(abonos.id, abono.id));

        console.log(
          `✅ Backfilled abono ${abono.id.slice(0, 8)} with user ${anyUser.id.slice(0, 8)} (fallback)`
        );
        result.backfilled++;
        continue;
      }

      // Update the abono with the owner as seller
      await db
        .update(abonos)
        .set({ sellerId: businessUser.id })
        .where(eq(abonos.id, abono.id));

      console.log(
        `✅ Backfilled abono ${abono.id.slice(0, 8)} with owner ${businessUser.id.slice(0, 8)}`
      );
      result.backfilled++;
    }

    // Also check for empty string seller_id
    const abonosWithEmptySeller = await db.query.abonos.findMany({
      where: eq(abonos.sellerId, ""),
    });

    console.log(`📊 Found ${abonosWithEmptySeller.length} abonos with empty seller_id`);

    for (const abono of abonosWithEmptySeller) {
      result.totalChecked++;

      const [businessUser] = await db
        .select()
        .from(businessUsers)
        .where(
          and(
            eq(businessUsers.businessId, abono.businessId),
            eq(businessUsers.role, "owner")
          )
        )
        .limit(1);

      if (!businessUser) {
        const [anyUser] = await db
          .select()
          .from(businessUsers)
          .where(eq(businessUsers.businessId, abono.businessId))
          .limit(1);

        if (!anyUser) {
          result.errors.push(`No business user for empty case: ${abono.id}`);
          continue;
        }

        await db
          .update(abonos)
          .set({ sellerId: anyUser.id })
          .where(eq(abonos.id, abono.id));

        result.backfilled++;
        continue;
      }

      await db
        .update(abonos)
        .set({ sellerId: businessUser.id })
        .where(eq(abonos.id, abono.id));

      result.backfilled++;
    }

    return result;
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    throw error;
  }
}

// Run the backfill
backfillAbonoSellerId()
  .then((result) => {
    console.log("\n📊 Results:");
    console.log(`   Total checked: ${result.totalChecked}`);
    console.log(`   Backfilled: ${result.backfilled}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      result.errors.forEach((err) => console.log(`   - ${err}`));
    }

    console.log("\n✅ Backfill completed!");
    console.log("⚠️  Remember to run: bun run scripts/fix-abono-sync-operations.ts");
    console.log("   to update sync_operations payloads as well.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  });
