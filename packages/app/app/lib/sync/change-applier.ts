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
  retriesLeft: number = MAX_APPLY_RETRIES
): Promise<ChangeApplicationResult> {
  const tableName = change.entityType;

  // Validate table name for safety
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    switch (change.operation) {
      case "create":
        return await applyInsert(pg, tableName, change, businessId);

      case "update":
        return await applyUpdate(pg, tableName, change, businessId);

      case "delete":
        return await applyDelete(pg, tableName, change);

      default:
        return { success: false, error: `Unknown operation: ${change.operation}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Retry on transient errors
    if (retriesLeft > 0 && isTransientError(errorMessage)) {
      console.warn(`[ChangeApplier] Retrying change for ${tableName}:${change.entityId} (${retriesLeft} retries left)`);
      await sleep(100);
      return applyChange(pg, _db, change, businessId, retriesLeft - 1);
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
    console.warn(`[ChangeApplier] Record ${tableName}:${id} not found for update, converting to insert`);
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
 * Apply a delete operation using raw SQL
 */
async function applyDelete(
  pg: PGlite,
  tableName: string,
  change: PullChange
): Promise<ChangeApplicationResult> {
  const id = change.entityId;
  await pg.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
  return { success: true };
}
