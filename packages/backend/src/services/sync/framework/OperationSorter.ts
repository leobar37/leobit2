import { ENTITY_PRIORITIES, getEntityPriority, type SyncEntity } from "@avileo/shared";
import type { SyncOperationInput } from "../types";

export interface SortResult {
  operations: SyncOperationInput[];
  groupCount: number;
}

export class OperationSorter {
  sort(operations: SyncOperationInput[]): SortResult {
    const sortedOperations = [...operations].sort((a, b) => {
      const aKey = a.syncGroupId ?? "";
      const bKey = b.syncGroupId ?? "";
      if (aKey !== bKey) {
        return aKey > bKey ? 1 : -1;
      }

      const priorityA = getEntityPriority(a.entityType as SyncEntity);
      const priorityB = getEntityPriority(b.entityType as SyncEntity);
      if (priorityA !== priorityB) return priorityA - priorityB;

      return new Date(a.localTimestamp).getTime() - new Date(b.localTimestamp).getTime();
    });

    const groupCount = new Set(sortedOperations.map((op) => op.syncGroupId)).size;

    return {
      operations: sortedOperations,
      groupCount,
    };
  }

  getPriorityMap(): Partial<Record<SyncEntity, number>> {
    return { ...ENTITY_PRIORITIES };
  }
}
