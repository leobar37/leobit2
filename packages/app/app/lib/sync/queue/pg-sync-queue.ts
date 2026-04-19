/**
 * PGlite Sync Queue Implementation
 *
 * Re-exports PgSyncQueue from @avileo/drizzle-sync/pglite with
 * Avileo-specific configuration (entity priorities).
 *
 * This wrapper provides:
 * - Entity priorities from @avileo/shared for ordering
 * - App-specific ID generation
 * - Backward-compatible exports
 *
 * @module sync/queue/pg-sync-queue
 */

import type { PGlite } from "@electric-sql/pglite";
import {
  PgSyncQueue as BasePgSyncQueue,
  OPERATION_STATUS,
  type PgSyncQueueOptions,
  type EntityPriorityConfig,
} from "@avileo/drizzle-sync/pglite";
import { ENTITY_PRIORITIES } from "@avileo/shared";
import { generateId } from "~/lib/utils/id-generator";

// Re-export operation status constants for backward compatibility
export { OPERATION_STATUS };

// Re-export types
export type { PgSyncQueueOptions, EntityPriorityConfig };

/**
 * Avileo-specific PgSyncQueue with app configuration.
 *
 * Extends the library's PgSyncQueue with:
 * - Entity priorities from @avileo/shared
 * - App's generateId function
 */
export class PgSyncQueue extends BasePgSyncQueue {
  constructor(pg: PGlite, businessId: string) {
    super(pg, businessId, {
      generateId,
      entityPriorities: ENTITY_PRIORITIES as EntityPriorityConfig,
    });
  }
}
