/**
 * Migration Script: Fix sync_status in sync_operations payloads (OPTIMIZED)
 *
 * This script updates all processed sync_operations records to inject
 * syncStatus: 'synced' and syncAttempts: 0 into their payloads.
 *
 * Uses parallel batch processing for speed.
 *
 * Run with: bun run scripts/fix-sync-status-payload.ts
 */

import { db, syncOperations } from "../src/lib/db";
import { eq, sql } from "drizzle-orm";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("FixSyncStatusPayload");
const BATCH_SIZE = 50; // Process 50 records in parallel per batch

async function fixSyncStatusPayloads() {
  logger.info("🚀 Starting sync_status payload fix migration (OPTIMIZED)");
  const startTime = Date.now();

  // Get total count
  const allOps = await db.select({ 
    id: syncOperations.id, 
    payload: syncOperations.payload,
  })
    .from(syncOperations)
    .where(eq(syncOperations.status, 'processed'));

  const totalToProcess = allOps.length;

  // Count already fixed
  const alreadyFixed = allOps.filter(op => {
    const p = op.payload as Record<string, unknown>;
    return p.syncStatus === 'synced';
  }).length;

  const remaining = totalToProcess - alreadyFixed;

  logger.info(`📊 Total: ${totalToProcess} | ✅ Already fixed: ${alreadyFixed} | ⏳ Remaining: ${remaining}`);

  if (remaining === 0) {
    logger.info("✅ All records already fixed!");
    process.exit(0);
  }

  // Get records that need fixing
  const opsToFix = allOps.filter(op => {
    const p = op.payload as Record<string, unknown>;
    return p.syncStatus !== 'synced';
  });

  let processed = alreadyFixed;
  let batchCount = 0;
  let errors = 0;

  // Process in batches with parallel updates
  for (let i = 0; i < opsToFix.length; i += BATCH_SIZE) {
    const batch = opsToFix.slice(i, i + BATCH_SIZE);
    batchCount++;

    try {
      // Update batch in parallel
      await Promise.all(
        batch.map(op => {
          const fixedPayload = {
            ...(op.payload as Record<string, unknown>),
            syncStatus: 'synced',
            syncAttempts: 0,
          };

          return db
            .update(syncOperations)
            .set({ payload: fixedPayload })
            .where(eq(syncOperations.id, op.id));
        })
      );

      processed += batch.length;

      if (batchCount % 10 === 0 || batch.length < BATCH_SIZE) {
        logger.info(`✅ Batch ${batchCount}: Fixed ${processed}/${totalToProcess} (${((processed/totalToProcess)*100).toFixed(1)}%)`);
      }
    } catch (error) {
      errors++;
      logger.error({
        msg: `❌ Failed to process batch ${batchCount}`,
        error: error instanceof Error ? error.message : String(error),
      });

      if (errors > 20) {
        logger.error("💥 Too many errors, stopping migration");
        break;
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.info({
    msg: "🏁 Migration completed",
    totalProcessed: processed,
    batches: batchCount,
    errors,
    timeSeconds: totalTime,
  });

  if (errors > 0) {
    logger.warn(`⚠️  ${errors} batches had errors`);
  }

  if (processed === totalToProcess) {
    logger.info("✅ All operations processed successfully");
    process.exit(0);
  } else {
    logger.warn(`⚠️  Only ${processed}/${totalToProcess} records processed`);
    process.exit(1);
  }
}

// Run the migration
fixSyncStatusPayloads().catch((error) => {
  logger.error({
    msg: "💥 Migration failed",
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
