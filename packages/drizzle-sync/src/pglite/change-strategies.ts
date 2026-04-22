/**
 * Change Application Strategies
 * SQL execution strategies for insert, update, and delete operations
 */

import type { SqlExecutor } from "./sql-executor";
import type { PullChange } from "./types";
import type { ChangeApplierConfig } from "./schema-mapper";
import { toSnakeCase, filterValidColumns, isRelationField, getTableColumns } from "./schema-mapper";
import { REQUIRED_COLUMN_DEFAULTS } from "./config-defaults";

/**
 * Apply an insert operation using raw SQL.
 * Uses upsert behavior if record already exists.
 */
export async function executeInsert(
  executor: SqlExecutor,
  tableName: string,
  change: PullChange,
  tenantId: string,
  tenantColumn: string = "tenant_id",
  config?: ChangeApplierConfig
): Promise<void> {
  const snakeCaseData = toSnakeCase(change.payload);
  const data = filterValidColumns(tableName, snakeCaseData, tenantColumn, config);

  const defaults = config?.requiredDefaults?.[tableName] ?? REQUIRED_COLUMN_DEFAULTS[tableName];
  if (defaults) {
    for (const [col, defaultVal] of Object.entries(defaults)) {
      if (data[col] === undefined || data[col] === null) {
        data[col] = defaultVal;
      }
    }
  }

  data.sync_status = 'synced';
  data.sync_attempts = 0;

  const id = change.entityId;

  const tableColumns = getTableColumns(tableName, tenantColumn, config);
  const hasTenantColumn = (tableColumns?.has(tenantColumn) ?? false) || Object.prototype.hasOwnProperty.call(data, tenantColumn);
  const columns: string[] = ["id"];
  const values: unknown[] = [id];

  if (hasTenantColumn) {
    columns.push(tenantColumn);
    values.push(tenantId);
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === tenantColumn) continue;
    if (isRelationField(key, config)) continue;
    columns.push(key);
    values.push(value);
  }

  // Check if record exists
  const existingResult = await executor.query<{ id: string }>(
    `SELECT id FROM "${tableName}" WHERE id = $1`, 
    [id]
  );

  if (existingResult.rows.length > 0) {
    // Record exists - do upsert (UPDATE)
    const updateCols = columns.filter((c) => c !== "id" && c !== tenantColumn);
    if (updateCols.length === 0) {
      return; // Nothing to update
    }

    const updateSets = updateCols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

    const upsertSql = `UPDATE "${tableName}" SET ${updateSets} WHERE id = $${updateCols.length + 1}`;
    await executor.exec(upsertSql, [...updateValues, id]);
  } else {
    // Insert new record
    const insertSql = `
      INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")})
      VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})`;

    await executor.exec(insertSql, values);
  }
}

/**
 * Apply an update operation using raw SQL.
 * If the record doesn't exist, it will be created (upsert behavior).
 */
export async function executeUpdate(
  executor: SqlExecutor,
  tableName: string,
  change: PullChange,
  tenantId: string,
  tenantColumn: string = "tenant_id",
  config?: ChangeApplierConfig
): Promise<void> {
  const snakeCaseData = toSnakeCase(change.payload);
  const data = filterValidColumns(tableName, snakeCaseData, tenantColumn, config);

  if (Object.keys(data).length === 0) {
    throw new Error("Empty payload for update operation");
  }

  data.sync_status = 'synced';
  data.sync_attempts = 0;

  const id = change.entityId;

  const existingResult = await executor.query<{ id: string }>(
    `SELECT id FROM "${tableName}" WHERE id = $1`, 
    [id]
  );

  if (existingResult.rows.length === 0) {
    return executeInsert(executor, tableName, change, tenantId, tenantColumn, config);
  }

  const updateCols = Object.keys(data).filter(
    (k) => k !== "id" && !isRelationField(k, config)
  );

  if (updateCols.length === 0) {
    return;
  }

  const setClause = updateCols.map((col, i) => `"${col}" = $${i + 1}`).join(", ");
  const updateValues = updateCols.map((col) => data[col as keyof typeof data]);

  const sql = `UPDATE "${tableName}" SET ${setClause} WHERE id = $${updateCols.length + 1}`;
  await executor.exec(sql, [...updateValues, id]);
}

/**
 * Apply a delete operation using raw SQL
 */
export async function executeDelete(
  executor: SqlExecutor,
  tableName: string,
  change: PullChange,
  _tenantId: string,
  _config?: ChangeApplierConfig
): Promise<void> {
  const id = change.entityId;
  await executor.exec(
    `DELETE FROM "${tableName}" WHERE id = $1`,
    [id]
  );
}
