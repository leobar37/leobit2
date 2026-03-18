/**
 * Change Applier
 * Applies sync changes to the local PGlite database using Drizzle ORM
 */

import { eq } from "drizzle-orm";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { PullChange, ChangeApplicationResult, SyncOperation } from "./types";
import { getTableForEntity, isValidTableName, toSnakeCase, filterValidColumns } from "./schema-mapper";
import { isTransientError, sleep } from "./backoff";

// Maximum number of retries for applying a single change
const MAX_APPLY_RETRIES = 3;

/**
 * Apply a single change to the local database with retry logic
 * @param pg - PGlite instance for raw queries when needed
 * @param db - Drizzle instance for ORM operations
 * @param change - Change to apply
 * @param businessId - Business ID for multi-tenancy
 * @param retriesLeft - Number of retries remaining
 * @returns Result of the operation
 */
export async function applyChange(
  pg: PGlite,
  db: ReturnType<typeof drizzle>,
  change: PullChange,
  businessId: string,
  retriesLeft: number = MAX_APPLY_RETRIES
): Promise<ChangeApplicationResult> {
  const tableName = change.entityType;

  // Validate table name for safety
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  const table = getTableForEntity(tableName);
  if (!table) {
    return { success: false, error: `Table not found: ${tableName}` };
  }

  try {
    switch (change.operation) {
      case "insert":
      case "create":
        return await applyInsert(db, table, change, businessId);

      case "update":
        return await applyUpdate(db, table, change, businessId);

      case "delete":
        return await applyDelete(db, table, change);

      default:
        return { success: false, error: `Unknown operation: ${change.operation}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Retry on transient errors
    if (retriesLeft > 0 && isTransientError(errorMessage)) {
      console.warn(`[ChangeApplier] Retrying change for ${tableName}:${change.entityId} (${retriesLeft} retries left)`);
      await sleep(100);
      return applyChange(pg, db, change, businessId, retriesLeft - 1);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Apply an insert operation using Drizzle ORM
 */
async function applyInsert(
  db: ReturnType<typeof drizzle>,
  table: any,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const data = toSnakeCase(change.payload);

  // Filter out invalid columns
  const tableName = change.entityType;
  const filteredData = filterValidColumns(tableName, data);

  // Inject required fields if missing
  if (!filteredData.id) {
    filteredData.id = change.entityId;
  }
  if (!filteredData.business_id) {
    filteredData.business_id = businessId;
  }

  if (Object.keys(filteredData).length === 0) {
    return { success: false, error: "Empty payload for insert operation" };
  }

  // Check if record exists
  const existing = await db.select({ id: table.id })
    .from(table)
    .where(eq(table.id, change.entityId))
    .limit(1);

  if (existing.length === 0) {
    // Insert new record
    await db.insert(table).values(filteredData);
  } else {
    // Record exists, do an upsert
    const { id, ...updateData } = filteredData;
    if (Object.keys(updateData).length > 0) {
      await db.insert(table)
        .values(filteredData)
        .onConflictDoUpdate({
          target: table.id,
          set: updateData,
        });
    }
  }

  return { success: true };
}

/**
 * Apply an update operation using Drizzle ORM
 */
async function applyUpdate(
  db: ReturnType<typeof drizzle>,
  table: any,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const data = toSnakeCase(change.payload);

  // Filter out invalid columns
  const tableName = change.entityType;
  const filteredData = filterValidColumns(tableName, data);

  if (Object.keys(filteredData).length === 0) {
    return { success: false, error: "Empty payload for update operation" };
  }

  // Ensure id is set
  if (!filteredData.id) {
    filteredData.id = change.entityId;
  }

  // Check if record exists
  const existing = await db.select({ id: table.id })
    .from(table)
    .where(eq(table.id, change.entityId))
    .limit(1);

  if (existing.length === 0) {
    // Record doesn't exist locally - skip it silently
    // The full record will come later via initial sync
    console.warn(`[ChangeApplier] Update for non-existent record skipped: ${tableName}:${change.entityId}`);
    return { success: true };
  }

  // Build update - only update fields that are in the payload
  const { id, ...updateData } = filteredData;

  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }

  await db.update(table)
    .set(updateData)
    .where(eq(table.id, change.entityId));

  return { success: true };
}

/**
 * Apply a delete operation using Drizzle ORM
 */
async function applyDelete(
  db: ReturnType<typeof drizzle>,
  table: any,
  change: PullChange
): Promise<ChangeApplicationResult> {
  await db.delete(table)
    .where(eq(table.id, change.entityId));

  return { success: true };
}
