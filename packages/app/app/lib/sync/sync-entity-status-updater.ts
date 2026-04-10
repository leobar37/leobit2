import type { PGlite } from "@electric-sql/pglite";
import type { SyncOperationRecord } from "./types";
import { validateEntityTableName } from "./types";

/**
 * Keeps entity-level sync_status in sync with queue outcomes.
 */
export class SyncEntityStatusUpdater {
  constructor(
    private pg: PGlite,
    private businessId: string
  ) {}

  async markSynced(operation: SyncOperationRecord): Promise<void> {
    const tableName = validateEntityTableName(operation.entity_type);
    if (!tableName) {
      return;
    }

    try {
      await this.pg.query(
        `UPDATE "${tableName}"
         SET sync_status = $1,
             sync_attempts = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND business_id = $3`,
        ["synced", operation.entity_id, this.businessId]
      );
    } catch (error) {
      console.warn(
        `Failed to update ${operation.entity_type} sync_status for ${operation.entity_id}:`,
        error
      );
    }
  }
}
