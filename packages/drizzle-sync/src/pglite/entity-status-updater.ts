import type { PGlite } from "@electric-sql/pglite";
import type { SyncOperationRecord } from "../core";
import { validateEntityTableName } from "../core";

export interface EntityStatusUpdaterOptions {
  /** Column name for tenant filtering (default: "tenant_id") */
  tenantColumn?: string;
  /** Set of entity types whose tables track sync_status */
  trackedTables?: Set<string>;
}

/**
 * Keeps entity-level sync_status in sync with queue outcomes.
 */
export class SyncEntityStatusUpdater {
  private readonly tenantColumn: string;
  private readonly trackedTables: Set<string>;

  constructor(
    private pg: PGlite,
    private tenantId: string,
    options: EntityStatusUpdaterOptions = {}
  ) {
    this.tenantColumn = options.tenantColumn ?? "tenant_id";
    this.trackedTables = options.trackedTables ?? new Set();
  }

  async markSynced(operation: SyncOperationRecord): Promise<void> {
    const tableName = validateEntityTableName(operation.entity_type);
    if (!tableName) {
      return;
    }
    if (this.trackedTables.size > 0 && !this.trackedTables.has(tableName)) {
      return;
    }

    try {
      await this.pg.query(
        `UPDATE "${tableName}"
         SET sync_status = $1,
             sync_attempts = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND "${this.tenantColumn}" = $3`,
        ["synced", operation.entity_id, this.tenantId]
      );
    } catch (error) {
      console.warn(
        `Failed to update ${operation.entity_type} sync_status for ${operation.entity_id}:`
      );
    }
  }
}
