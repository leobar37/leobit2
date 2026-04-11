/**
 * Change Applier
 * Applies sync changes to the local PGlite database using raw SQL
 * (Drizzle ORM has issues with schema mismatch between @avileo/shared camelCase
 * and local PGlite snake_case column names)
 */

import type { PGlite } from "@electric-sql/pglite";
import type { PullChange, ChangeApplicationResult } from "./types";
import { isValidTableName, toSnakeCase, filterValidColumns } from "./schema-mapper";
import { isTransientError, sleep } from "./backoff";
import { syncLogger } from "./sync-logger";

const MAX_APPLY_RETRIES = 3;

// Default values for NOT NULL columns that may be missing from sync payloads.
// When the backend stores the original client payload in sync_operations,
// fields with server-side defaults (like basePrice → "0") are not included.
// This map ensures the change-applier can still INSERT without NOT NULL violations.
const REQUIRED_COLUMN_DEFAULTS: Record<string, Record<string, unknown>> = {
  products: {
    base_price: "0",
    cost_price: "0",
  },
  product_variants: {
    price: "0",
    cost_price: "0",
    unit_quantity: "1",
  },
};

const RELATION_FIELDS = new Set([
  "items", "customer", "seller", "business", "distribucion", "visita",
  "sale", "product", "variant", "supplier", "purchase",
  "advanceProofImage", "cancelledBy", "createdBy", "updatedBy",
]);

/**
 * Check if a local record has unsynced changes that could be overwritten
 * @param pg - PGlite instance
 * @param tableName - Table name
 * @param entityId - Entity ID
 * @returns True if record has pending local changes
 */
async function hasUnsyncedLocalChanges(
  pg: PGlite,
  tableName: string,
  entityId: string
): Promise<boolean> {
  try {
    const result = await pg.query(
      `SELECT sync_status FROM "${tableName}" WHERE id = $1`,
      [entityId]
    );
    if (result.rows.length === 0) {
      return false;
    }
    const syncStatus = result.rows[0].sync_status;
    return syncStatus === 'pending' || syncStatus === 'syncing' || syncStatus === 'failed';
  } catch {
    return false;
  }
}

/**
 * Apply a single change to the local database with retry logic
 * @param pg - PGlite instance for raw queries
 * @param _db - Unused (kept for API compatibility)
 * @param change - Change to apply
 * @param businessId - Business ID for multi-tenancy
 * @param retriesLeft - Number of retries remaining
 * @returns Result of the operation
 */
export async function applyChange(
  pg: PGlite,
  _db: unknown,
  change: PullChange,
  businessId: string,
  retriesLeft: number = MAX_APPLY_RETRIES,
  checkConflicts: boolean = true
): Promise<ChangeApplicationResult> {
  const tableName = change.entityType;

  // Validate table name for safety
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    // Check for potential conflict with local unsynced changes
    if (checkConflicts && change.operation === 'update') {
      const hasLocalChanges = await hasUnsyncedLocalChanges(pg, tableName, change.entityId);
      if (hasLocalChanges) {
        syncLogger.warn('[ChangeApplier]', `Potential conflict: ${tableName}:${change.entityId} has unsynced local changes`);
        // Still apply but log the conflict - server wins in this case
      }
    }

    switch (change.operation) {
      case "create":
      case "insert": // backward compatibility with old server responses
        return await applyInsert(pg, tableName, change, businessId);

      case "update":
        return await applyUpdate(pg, tableName, change, businessId);

      case "delete":
        return await applyDelete(pg, tableName, change, businessId);

      default:
        return { success: false, error: `Unknown operation: ${change.operation}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Retry on transient errors
    if (retriesLeft > 0 && isTransientError(errorMessage)) {
      syncLogger.warn('[ChangeApplier]', `Retrying change for ${tableName}:${change.entityId} (${retriesLeft} retries left)`);
      await sleep(100);
      return applyChange(pg, _db, change, businessId, retriesLeft - 1, checkConflicts);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Apply an insert operation using raw SQL
 */
async function applyInsert(
  pg: PGlite,
  tableName: string,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const snakeCaseData = toSnakeCase(change.payload);
  const data = filterValidColumns(tableName, snakeCaseData);

  // Apply required column defaults for missing NOT NULL fields
  const defaults = REQUIRED_COLUMN_DEFAULTS[tableName];
  if (defaults) {
    for (const [col, defaultVal] of Object.entries(defaults)) {
      if (data[col] === undefined || data[col] === null) {
        data[col] = defaultVal;
      }
    }
  }

  // Inject required fields
  const id = change.entityId;
  const business_id = businessId;

  // Build column/value pairs
  const columns: string[] = ["id", "business_id"];
  const values: unknown[] = [id, business_id];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "business_id") continue;
    if (RELATION_FIELDS.has(key)) continue;
    columns.push(key);
    values.push(value);
    paramIndex++;
  }

  const setClause = columns.map((col, i) => {
    if (i < 2) return `${col} = $${i + 1}`;
    return `${col} = $${i + 1}`;
  }).join(", ");

  // Check if record exists
  const existingResult = await pg.query(`SELECT id FROM "${tableName}" WHERE id = $1`, [id]);
  if (existingResult.rows.length > 0) {
    // Record exists - do upsert
    const updateCols = columns.filter(c => c !== "id" && c !== "business_id");
    const updateSets = updateCols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

    const upsertSql = `
      UPDATE "${tableName}" SET ${updateSets}
      WHERE id = $${updateCols.length + 1}
    `;

    await pg.query(upsertSql, [...updateValues, id]);
  } else {
    // Insert new record
    const insertSql = `
      INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")})
      VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})
    `;

    await pg.query(insertSql, values);
  }

  return { success: true };
}

/**
 * Apply an update operation using raw SQL
 * If the record doesn't exist, it will be created (upsert behavior)
 */
async function applyUpdate(
  pg: PGlite,
  tableName: string,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const snakeCaseData = toSnakeCase(change.payload);
  const data = filterValidColumns(tableName, snakeCaseData);

  if (Object.keys(data).length === 0) {
    return { success: false, error: "Empty payload for update operation" };
  }

  const id = change.entityId;

  // Check if record exists
  const existingResult = await pg.query(`SELECT id FROM "${tableName}" WHERE id = $1`, [id]);
  
  if (existingResult.rows.length === 0) {
    // Record doesn't exist - convert to insert (upsert behavior)
    syncLogger.warn('[ChangeApplier]', `Record ${tableName}:${id} not found for update, converting to insert`);
    return applyInsert(pg, tableName, change, businessId);
  }

  // Build SET clause
  const updateCols = Object.keys(data).filter(k => k !== "id" && !RELATION_FIELDS.has(k));
  if (updateCols.length === 0) {
    return { success: true };
  }

  const setClause = updateCols.map((col, i) => `"${col}" = $${i + 1}`).join(", ");
  const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

  const sql = `
    UPDATE "${tableName}" SET ${setClause}
    WHERE id = $${updateCols.length + 1}
  `;

  await pg.query(sql, [...updateValues, id]);

  return { success: true };
}

/**
 * Batch-apply multiple changes with pre-computed conflict set.
 * Replaces N individual hasUnsyncedLocalChanges queries with 1 batch query.
 */
export async function applyChangesBatch(
  pg: PGlite,
  _db: unknown,
  changes: PullChange[],
  businessId: string,
  checkConflicts: boolean = true
): Promise<{ entityTypes: Set<string>; failedChanges: Array<{ change: PullChange; error: string }> }> {
  // Pre-compute conflicting entity IDs in a single batch query
  const conflictedIds = new Set<string>();
  if (checkConflicts) {
    const updateChanges = changes.filter(c => c.operation === 'update');
    if (updateChanges.length > 0) {
      // Group by table for batch querying
      const byTable = new Map<string, string[]>();
      for (const change of updateChanges) {
        const ids = byTable.get(change.entityType) || [];
        ids.push(change.entityId);
        byTable.set(change.entityType, ids);
      }

      // One query per table instead of N queries per change
      for (const [tableName, entityIds] of byTable) {
        if (!isValidTableName(tableName)) continue;
        try {
          const result = await pg.query(
            `SELECT id FROM "${tableName}" WHERE id = ANY($1) AND sync_status IN ('pending','syncing','failed')`,
            [entityIds]
          );
          for (const row of result.rows) {
            conflictedIds.add(`${tableName}:${row.id}`);
          }
        } catch {
          // Table may not exist — skip
        }
      }
    }
  }

  const entityTypes = new Set<string>();
  const failedChanges: Array<{ change: PullChange; error: string }> = [];

  for (const change of changes) {
    const result = await applyChangeWithConflictSet(pg, _db, change, businessId, conflictedIds, checkConflicts);

    if (result.success) {
      entityTypes.add(change.entityType);
    } else {
      syncLogger.error('[Pull]', `Failed to apply change for ${change.entityType}:${change.entityId}`, result.error);
      failedChanges.push({ change, error: result.error || "Unknown error" });
    }
  }

  return { entityTypes, failedChanges };
}

/**
 * Apply a single change using a pre-computed conflict set (O(1) lookup).
 */
async function applyChangeWithConflictSet(
  pg: PGlite,
  _db: unknown,
  change: PullChange,
  businessId: string,
  conflictedIds: Set<string>,
  checkConflicts: boolean = true,
  retriesLeft: number = MAX_APPLY_RETRIES,
): Promise<ChangeApplicationResult> {
  const tableName = change.entityType;

  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    // O(1) lookup in pre-computed set instead of per-change DB query
    if (checkConflicts && change.operation === 'update') {
      if (conflictedIds.has(`${tableName}:${change.entityId}`)) {
        syncLogger.warn('[ChangeApplier]', `Potential conflict: ${tableName}:${change.entityId} has unsynced local changes`);
      }
    }

    switch (change.operation) {
      case "create":
      case "insert":
        return await applyInsert(pg, tableName, change, businessId);
      case "update":
        return await applyUpdate(pg, tableName, change, businessId);
      case "delete":
        return await applyDelete(pg, tableName, change, businessId);
      default:
        return { success: false, error: `Unknown operation: ${change.operation}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (retriesLeft > 0 && isTransientError(errorMessage)) {
      await sleep(100);
      return applyChangeWithConflictSet(pg, _db, change, businessId, conflictedIds, checkConflicts, retriesLeft - 1);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Apply a delete operation using raw SQL
 */
async function applyDelete(
  pg: PGlite,
  tableName: string,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const id = change.entityId;
  await pg.query(
    `DELETE FROM "${tableName}" WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  );
  return { success: true };
}
