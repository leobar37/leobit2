/**
 * Fix Abono Sync Operations
 *
 * Fixes sync_operations records for abonos that are missing sellerId in payload.
 * This script:
 * 1. Finds all abono sync_operations
 * 2. Checks if payload has sellerId
 * 3. If missing, fetches from abonos table and updates payload
 *
 * Usage: cd packages/backend && bun run scripts/fix-abono-sync-operations.ts
 */

import { db } from "../src/lib/db";
import { syncOperations, abonos } from "../src/db/schema";
import { eq } from "drizzle-orm";

interface FixResult {
  totalChecked: number;
  fixed: number;
  skipped: number;
  errors: string[];
}

async function fixAbonoSyncOperations(): Promise<FixResult> {
  const result: FixResult = {
    totalChecked: 0,
    fixed: 0,
    skipped: 0,
    errors: [],
  };

  console.log("🔍 Starting abono sync_operations fix...");

  try {
    // Find all abono sync_operations
    const operations = await db.query.syncOperations.findMany({
      where: eq(syncOperations.entity, "abonos"),
    });

    console.log(`📊 Found ${operations.length} abono sync_operations`);

    for (const op of operations) {
      result.totalChecked++;

      // Check if payload has sellerId
      const payload = op.payload as Record<string, unknown>;

      if (payload.sellerId) {
        result.skipped++;
        continue;
      }

      console.log(
        `⚠️  Operation ${op.id.slice(0, 8)} missing sellerId, fetching from abono...`,
      );

      // Fetch the actual abono record
      const abono = await db.query.abonos.findFirst({
        where: eq(abonos.id, op.entityId),
      });

      if (!abono) {
        console.error(
          `❌ Abono ${op.entityId} not found for operation ${op.id}`,
        );
        result.errors.push(`Abono not found: ${op.entityId}`);
        continue;
      }

      if (!abono.sellerId) {
        console.error(`❌ Abono ${op.entityId} has no sellerId!`);
        result.errors.push(`Abono has no sellerId: ${op.entityId}`);
        continue;
      }

      // Update the sync operation with sellerId
      const updatedPayload = {
        ...payload,
        sellerId: abono.sellerId,
      };

      await db
        .update(syncOperations)
        .set({
          payload: updatedPayload,
        })
        .where(eq(syncOperations.id, op.id));

      console.log(
        `✅ Fixed operation ${op.id.slice(0, 8)} with sellerId ${abono.sellerId.slice(0, 8)}`,
      );
      result.fixed++;
    }

    return result;
  } catch (error) {
    console.error("❌ Fatal error during fix:", error);
    throw error;
  }
}

// Run the fix
fixAbonoSyncOperations()
  .then((result) => {
    console.log("\n📊 Results:");
    console.log(`   Total checked: ${result.totalChecked}`);
    console.log(`   Fixed: ${result.fixed}`);
    console.log(
      `   Skipped (already had sellerId): ${result.skipped}`,
    );
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      result.errors.forEach((err) => console.log(`   - ${err}`));
      process.exit(1);
    }

    console.log("\n✅ Fix completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  });
