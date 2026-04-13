/**
 * Change Applier
 * Applies sync changes to the local PGlite database using raw SQL
 * (Drizzle ORM has issues with schema mismatch between @avileo/shared camelCase
 * and local PGlite snake_case column names)
 */

import type { PGlite } from "@electric-sql/pglite";
import type { PullChange, ChangeApplicationResult } from "./types";
import { isValidTableName, toSnakeCase, filterValidColumns, isRelationField } from "./schema-mapper";
import { withRetry } from "./retry-wrapper";
import { syncLogger } from "./sync-logger";

// Types for query results
interface SyncStatusRow {
  sync_status: string;
}

interface EntityIdRow {
  id: string;
}

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
  abonos: {
    // seller_id may be null for legacy data; use empty string as placeholder
    // (will be visible in UI as missing seller until data is corrected)
    seller_id: "",
  },
};

// Types for conflict checking strategy
export type ConflictStrategy = "check-db" | "pre-computed-set" | "none";

export interface ApplyChangeOptions {
  /** Number of retries on transient errors (default: 3) */
  maxRetries?: number;
  /** Whether to check for conflicts with local unsynced changes */
  checkConflicts?: boolean;
  /** Conflict checking strategy */
  conflictStrategy?: ConflictStrategy;
  /** Pre-computed set of conflicting entity IDs (for "pre-computed-set" strategy) */
  conflictedIds?: Set<string>;
}

export interface ApplyChangesBatchResult {
  entityTypes: Set<string>;
  failedChanges: Array<{ change: PullChange; error: string }>;
  appliedCount: number;
  totalCount: number;
}

/**
 * Apply a single change to the local database with retry logic.
 * @deprecated Use overload without _db parameter
 */
export async function applyChange(
  pg: PGlite,
  _db: unknown,
  change: PullChange,
  businessId: string,
  options?: ApplyChangeOptions
): Promise<ChangeApplicationResult>;

/**
 * Apply a single change to the local database with retry logic.
 */
export async function applyChange(
  pg: PGlite,
  change: PullChange,
  businessId: string,
  options?: ApplyChangeOptions
): Promise<ChangeApplicationResult>;

/**
 * Implementation
 */
export async function applyChange(
  pg: PGlite,
  arg2: unknown,
  arg3: PullChange | string,
  arg4?: ApplyChangeOptions | string,
  arg5?: ApplyChangeOptions
): Promise<ChangeApplicationResult> {
  // Handle overload signatures
  // arg2 is _db (unknown) when using deprecated signature, or change when using new signature
  const change: PullChange =
    arg2 && typeof arg2 === "object" && "entityType" in arg2
      ? (arg2 as PullChange)
      : (arg3 as PullChange);
  const businessId: string =
    arg2 && typeof arg2 === "object" && "entityType" in arg2
      ? (arg3 as string)
      : (arg4 as string);
  const options: ApplyChangeOptions =
    arg2 && typeof arg2 === "object" && "entityType" in arg2
      ? (arg4 as ApplyChangeOptions ?? {})
      : (arg5 ?? {});

  const {
    maxRetries = 3,
    checkConflicts = true,
    conflictStrategy = "none",
    conflictedIds = new Set(),
  } = options;

  const tableName = change.entityType;

  // Validate table name for safety (SQL injection protection)
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    // Check for potential conflict with local unsynced changes
    if (checkConflicts && change.operation === "update") {
      const hasConflict = await checkForConflict(
        pg,
        tableName,
        change.entityId,
        conflictStrategy,
        conflictedIds
      );
      if (hasConflict) {
        syncLogger.warn(
          "[ChangeApplier]",
          `Potential conflict: ${tableName}:${change.entityId} has unsynced local changes`
        );
        // Still apply - server wins in this case
      }
    }

    // Apply operation with retry wrapper
    return await withRetry(
      async () => {
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
      },
      {
        maxRetries,
        retryDelayMs: 100,
        onRetry: (attempt) => {
          syncLogger.warn(
            "[ChangeApplier]",
            `Retrying ${tableName}:${change.entityId} (attempt ${attempt})`
          );
        },
        context: "applyChange",
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check for conflict using the specified strategy.
 */
async function checkForConflict(
  pg: PGlite,
  tableName: string,
  entityId: string,
  strategy: ConflictStrategy,
  conflictedIds: Set<string>
): Promise<boolean> {
  if (strategy === "none") return false;

  if (strategy === "pre-computed-set") {
    return conflictedIds.has(`${tableName}:${entityId}`);
  }

  // "check-db" - individual query
  try {
    const result = await pg.query<SyncStatusRow>(
      `SELECT sync_status FROM "${tableName}" WHERE id = $1`,
      [entityId]
    );

    if (result.rows.length === 0) return false;

    const syncStatus = result.rows[0].sync_status;
    return syncStatus === "pending" || syncStatus === "syncing" || syncStatus === "failed";
  } catch {
    return false;
  }
}

/**
 * Apply an insert operation using raw SQL.
 * Uses upsert behavior if record already exists.
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

  // Force sync_status to 'synced' since this data came from the server
  data.sync_status = 'synced';
  data.sync_attempts = 0;

  const id = change.entityId;

  // Build column/value pairs, skipping relation fields
  const columns: string[] = ["id", "business_id"];
  const values: unknown[] = [id, businessId];

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "business_id") continue;
    if (isRelationField(key)) continue;
    columns.push(key);
    values.push(value);
  }

  // Check if record exists
  const existingResult = await pg.query(`SELECT id FROM "${tableName}" WHERE id = $1`, [id]);

  if (existingResult.rows.length > 0) {
    // Record exists - do upsert (UPDATE)
    const updateCols = columns.filter((c) => c !== "id" && c !== "business_id");
    if (updateCols.length === 0) {
      return { success: true }; // Nothing to update
    }

    const updateSets = updateCols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

    const upsertSql = `UPDATE "${tableName}" SET ${updateSets} WHERE id = $${updateCols.length + 1}`;
    await pg.query(upsertSql, [...updateValues, id]);
  } else {
    // Insert new record
    const insertSql = `
      INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")})
      VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})`;

    await pg.query(insertSql, values);
  }

  return { success: true };
}

/**
 * Apply an update operation using raw SQL.
 * If the record doesn't exist, it will be created (upsert behavior).
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

  // Force sync_status to 'synced' since this data came from the server
  data.sync_status = 'synced';
  data.sync_attempts = 0;

  const id = change.entityId;

  // Check if record exists
  const existingResult = await pg.query(`SELECT id FROM "${tableName}" WHERE id = $1`, [id]);

  if (existingResult.rows.length === 0) {
    // Record doesn't exist - convert to insert (upsert behavior)
    syncLogger.warn(
      "[ChangeApplier]",
      `Record ${tableName}:${id} not found for update, converting to insert`
    );
    return applyInsert(pg, tableName, change, businessId);
  }

  // Build SET clause, skipping relation fields
  const updateCols = Object.keys(data).filter(
    (k) => k !== "id" && !isRelationField(k)
  );

  if (updateCols.length === 0) {
    return { success: true };
  }

  const setClause = updateCols.map((col, i) => `"${col}" = $${i + 1}`).join(", ");
  const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

  const sql = `UPDATE "${tableName}" SET ${setClause} WHERE id = $${updateCols.length + 1}`;
  await pg.query(sql, [...updateValues, id]);

  return { success: true };
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
  await pg.query(`DELETE FROM "${tableName}" WHERE id = $1 AND business_id = $2`, [
    id,
    businessId,
  ]);
  return { success: true };
}

/**
 * Pre-compute conflicting entity IDs in a single batch query.
 */
async function computeConflictedIds(
  pg: PGlite,
  changes: PullChange[]
): Promise<Set<string>> {
  const conflictedIds = new Set<string>();
  const updateChanges = changes.filter((c) => c.operation === "update");

  if (updateChanges.length === 0) {
    return conflictedIds;
  }

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
      const result = await pg.query<EntityIdRow>(
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

  return conflictedIds;
}

/**
 * Batch-apply multiple changes with optional transaction support.
 * @deprecated Use overload without _db parameter
 */
export async function applyChangesBatch(
  pg: PGlite,
  _db: unknown,
  changes: PullChange[],
  businessId: string,
  options?: {
    checkConflicts?: boolean;
    useTransaction?: boolean;
    maxRetries?: number;
  }
): Promise<ApplyChangesBatchResult>;

/**
 * Batch-apply multiple changes with optional transaction support.
 */
export async function applyChangesBatch(
  pg: PGlite,
  changes: PullChange[],
  businessId: string,
  options?: {
    checkConflicts?: boolean;
    useTransaction?: boolean;
    maxRetries?: number;
  }
): Promise<ApplyChangesBatchResult>;

/**
 * Implementation
 */
export async function applyChangesBatch(
  pg: PGlite,
  arg2: unknown,
  arg3: PullChange[] | string,
  arg4?: string | { checkConflicts?: boolean; useTransaction?: boolean; maxRetries?: number },
  arg5?: { checkConflicts?: boolean; useTransaction?: boolean; maxRetries?: number }
): Promise<ApplyChangesBatchResult> {
  // Handle overload signatures
  const changes: PullChange[] =
    Array.isArray(arg2) ? arg2 : (arg3 as PullChange[]);
  const businessId: string =
    Array.isArray(arg2) ? (arg3 as string) : (arg4 as string);
  const options =
    Array.isArray(arg2) ? (arg4 as { checkConflicts?: boolean; useTransaction?: boolean; maxRetries?: number } ?? {}) : (arg5 ?? {});

  const { checkConflicts = true, useTransaction = false, maxRetries = 3 } = options;

  // Pre-compute conflicted IDs
  const conflictedIds = checkConflicts ? await computeConflictedIds(pg, changes) : new Set<string>();

  const entityTypes = new Set<string>();
  const failedChanges: Array<{ change: PullChange; error: string }> = [];

  const applyFn = async (change: PullChange) => {
    const result = await applyChange(pg, change, businessId, {
      maxRetries,
      checkConflicts,
      conflictStrategy: "pre-computed-set",
      conflictedIds,
    });
    return result;
  };

  if (useTransaction) {
    await executeWithTransaction(pg, changes, applyFn, entityTypes, failedChanges);
  } else {
    for (const change of changes) {
      const result = await applyFn(change);

      if (result.success) {
        entityTypes.add(change.entityType);
      } else {
        syncLogger.error(
          "[Pull]",
          `Failed to apply change for ${change.entityType}:${change.entityId}`,
          result.error
        );
        failedChanges.push({ change, error: result.error || "Unknown error" });
      }
    }
  }

  return {
    entityTypes,
    failedChanges,
    appliedCount: changes.length - failedChanges.length,
    totalCount: changes.length,
  };
}

/**
 * Execute batch with transaction support.
 * PGlite may not fully support transactions - falls back gracefully.
 */
async function executeWithTransaction(
  pg: PGlite,
  changes: PullChange[],
  applyFn: (change: PullChange) => Promise<ChangeApplicationResult>,
  entityTypes: Set<string>,
  failedChanges: Array<{ change: PullChange; error: string }>
): Promise<void> {
  try {
    await pg.query("BEGIN");
  } catch (beginError) {
    // PGlite may not support transactions - fall back to non-transactional
    syncLogger.warn(
      "[ChangeApplier]",
      "Transaction BEGIN failed, using non-transactional mode"
    );
    await executeWithoutTransaction(pg, changes, applyFn, entityTypes, failedChanges);
    return;
  }

  try {
    for (const change of changes) {
      const result = await applyFn(change);

      if (result.success) {
        entityTypes.add(change.entityType);
      } else {
        failedChanges.push({ change, error: result.error || "Unknown error" });
      }
    }

    await pg.query("COMMIT");
  } catch (error) {
    try {
      await pg.query("ROLLBACK");
    } catch {
      // Ignore rollback errors
    }

    // Mark remaining changes as failed
    for (const change of changes) {
      if (!failedChanges.find((f) => f.change === change)) {
        failedChanges.push({
          change,
          error: error instanceof Error ? error.message : "Transaction failed",
        });
      }
    }
  }
}

/**
 * Execute batch without transaction (original behavior).
 */
async function executeWithoutTransaction(
  pg: PGlite,
  changes: PullChange[],
  applyFn: (change: PullChange) => Promise<ChangeApplicationResult>,
  entityTypes: Set<string>,
  failedChanges: Array<{ change: PullChange; error: string }>
): Promise<void> {
  for (const change of changes) {
    const result = await applyFn(change);

    if (result.success) {
      entityTypes.add(change.entityType);
    } else {
      failedChanges.push({ change, error: result.error || "Unknown error" });
    }
  }
}
