/**
 * Conflict Checker
 * Detects conflicts between incoming server changes and local unsynced changes
 */

import type { SqlExecutor } from "./sql-executor";
import type { PullChange } from "./types";
import { isValidTableName } from "./schema-mapper";

export type ConflictCheckStrategy = 'pre-computed-set' | 'check-db' | 'none';

/**
 * Check for conflict using the specified strategy.
 */
export async function checkForConflict(
  executor: SqlExecutor,
  tableName: string,
  entityId: string,
  strategy: ConflictCheckStrategy,
  conflictedIds: Set<string>
): Promise<boolean> {
  if (strategy === "none") return false;

  if (strategy === "pre-computed-set") {
    return conflictedIds.has(`${tableName}:${entityId}`);
  }

  // "check-db" - individual query
  try {
    const result = await executor.query<{ sync_status: string }>(
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
 * Pre-compute conflicting entity IDs in a single batch query.
 */
export async function computeConflictedIds(
  executor: SqlExecutor,
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
      const result = await executor.query<{ id: string }>(
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
