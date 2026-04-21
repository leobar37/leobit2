/**
 * Sync Entity Status Updater
 *
 * Keeps entity-level sync_status in sync with queue outcomes.
 * This is a generic implementation that works with any entity table
 * that has sync_status and sync_attempts columns.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { SyncOperationRecord } from "../core";
import { SYNC_STATUS_ENTITY_TABLES } from "../core";

/**
 * Options for SyncEntityStatusUpdater
 */
export interface SyncEntityStatusUpdaterOptions {
  /**
   * Optional logger for warnings/errors.
   * If not provided, console.warn will be used.
   */
  logger?: {
    warn(message: string, ...args: unknown[]): void;
  };
  /**
   * Custom set of entity tables that track sync_status.
   * If not provided, uses the default SYNC_STATUS_ENTITY_TABLES.
   */
  trackedEntities?: ReadonlySet<string>;
}

export class SyncEntityStatusUpdater {
  private readonly logger?: { warn(message: string, ...args: unknown[]): void };
  private readonly trackedEntities: ReadonlySet<string>;

  constructor(
    private pg: PGlite,
    private businessId: string,
    options?: SyncEntityStatusUpdaterOptions
  ) {
    this.logger = options?.logger;
    this.trackedEntities = options?.trackedEntities ?? SYNC_STATUS_ENTITY_TABLES;
  }

  async markSynced(operation: SyncOperationRecord): Promise<void> {
    const tableName = this.validateEntityTableName(operation.entity_type);
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
      const message = `Failed to update ${operation.entity_type} sync_status for ${operation.entity_id}`;
      if (this.logger) {
        this.logger.warn(message, error);
      } else {
        console.warn(message, error);
      }
    }
  }

  private validateEntityTableName(entityType: string): string | null {
    return this.trackedEntities.has(entityType) ? entityType : null;
  }
}
