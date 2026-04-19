/**
 * OperationSorter
 *
 * Sorts sync operations by syncGroupId, entity priority, and timestamp.
 * Ensures parent entities are processed before children within sync groups.
 */

import { ENTITY_PRIORITIES, getEntityPriority, type SyncEntity } from "@avileo/shared";
import type { SyncOperationInput } from "./types";

/**
 * Result of sorting operations
 */
export interface SortResult {
  operations: SyncOperationInput[];
  groupCount: number;
}

/**
 * OperationSorter
 * Sorts operations for proper processing order
 */
export class OperationSorter {
  /**
   * Sort operations by:
   * 1. syncGroupId (group related operations together)
   * 2. Entity priority (parents before children)
   * 3. Local timestamp (chronological order within same priority)
   */
  sort(operations: SyncOperationInput[]): SortResult {
    const sortedOperations = [...operations].sort((a, b) => {
      // First, sort by syncGroupId
      const aKey = a.syncGroupId ?? "";
      const bKey = b.syncGroupId ?? "";
      if (aKey !== bKey) {
        return aKey > bKey ? 1 : -1;
      }

      // Then, sort by entity priority
      const priorityA = getEntityPriority(a.entityType as SyncEntity);
      const priorityB = getEntityPriority(b.entityType as SyncEntity);
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Finally, sort by timestamp
      return new Date(a.localTimestamp).getTime() - new Date(b.localTimestamp).getTime();
    });

    // Count unique sync groups
    const groupCount = new Set(sortedOperations.map((op) => op.syncGroupId)).size;

    return {
      operations: sortedOperations,
      groupCount,
    };
  }

  /**
   * Get the entity priority map
   */
  getPriorityMap(): Partial<Record<SyncEntity, number>> {
    return { ...ENTITY_PRIORITIES };
  }
}
