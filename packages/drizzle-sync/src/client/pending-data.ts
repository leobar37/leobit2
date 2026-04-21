/**
 * Pending Data Export/Import
 *
 * Generic interfaces and utilities for preserving pending (unsynced) data
 * across schema resets. The consumer provides table-specific queries.
 */

import type { PGlite } from "@electric-sql/pglite";

/**
 * Definition of a table to export/import during schema reset
 */
export interface PendingTableConfig {
  /** Table name */
  name: string;
  /** WHERE clause for filtering pending rows (e.g. "sync_status IN ('pending', 'error')") */
  where: string;
  /** Column names to select (default: *) */
  columns?: string;
  /** Whether this table references another table (for ordering) */
  dependsOn?: string[];
}

/**
 * Raw pending data from a single table
 */
export interface PendingTableData {
  table: string;
  rows: Record<string, unknown>[];
}

/**
 * Configuration for pending data export/import
 */
export interface PendingDataConfig {
  /** Tables to export, in dependency order */
  tables: PendingTableConfig[];
  /** Optional filter for rows that should be preserved */
  rowFilter?: (row: Record<string, unknown>) => boolean;
}

/**
 * Export pending data from existing database before schema reset
 */
export async function exportPendingData(
  pg: PGlite,
  config: PendingDataConfig
): Promise<PendingTableData[]> {
  const results: PendingTableData[] = [];

  for (const tableConfig of config.tables) {
    try {
      const columns = tableConfig.columns ?? "*";
      const queryResult = await pg.query<Record<string, unknown>>(
        `SELECT ${columns} FROM ${tableConfig.name} WHERE ${tableConfig.where}`
      );

      const rows = config.rowFilter
        ? queryResult.rows.filter(config.rowFilter)
        : queryResult.rows;

      if (rows.length > 0) {
        results.push({ table: tableConfig.name, rows });
      }
    } catch (err) {
      // Table may not exist yet (first init)
      console.warn(`[PendingData] Could not export from ${tableConfig.name}:`, err);
    }
  }

  return results;
}

/**
 * Import pending data into fresh database after schema reset
 *
 * Uses parameterized INSERT with ON CONFLICT DO UPDATE
 */
export async function importPendingData(
  pg: PGlite,
  data: PendingTableData[],
  options?: {
    /** Columns to update on conflict (default: sync_status, sync_attempts, updated_at) */
    conflictUpdateColumns?: string[];
    /** Callback to transform row before insert */
    transformRow?: (table: string, row: Record<string, unknown>) => Record<string, unknown> | null;
  }
): Promise<void> {
  const defaultConflictColumns = ["sync_status", "sync_attempts", "updated_at"];
  const conflictUpdateColumns = options?.conflictUpdateColumns ?? defaultConflictColumns;

  for (const tableData of data) {
    for (const row of tableData.rows) {
      const transformedRow = options?.transformRow
        ? options.transformRow(tableData.table, row)
        : row;

      if (!transformedRow) continue;

      const columns = Object.keys(transformedRow);
      if (columns.length === 0) continue;

      const values = Object.values(transformedRow);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const updateSet = conflictUpdateColumns
        .filter((col) => columns.includes(col))
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(", ");

      try {
        if (updateSet) {
          await pg.query(
            `INSERT INTO ${tableData.table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
            values
          );
        } else {
          await pg.query(
            `INSERT INTO ${tableData.table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values
          );
        }
      } catch (err) {
        console.warn(`[PendingData] Failed to import row into ${tableData.table}:`, err);
      }
    }
  }
}

/**
 * Build a PendingDataConfig from table names
 */
export function buildPendingDataConfig(
  tableNames: string[],
  options?: {
    /** WHERE clause for all tables */
    where?: string;
    /** Per-table WHERE overrides */
    whereByTable?: Record<string, string>;
  }
): PendingDataConfig {
  const defaultWhere = options?.where ?? "sync_status IN ('pending', 'error')";

  return {
    tables: tableNames.map((name) => ({
      name,
      where: options?.whereByTable?.[name] ?? defaultWhere,
    })),
  };
}
