import type { SyncOperationInput } from "../types";

export interface SortResult {
  operations: SyncOperationInput[];
  groupCount: number;
}

export class OperationSorter {
  private entityPriority: Record<string, number> = {
    sales: 1,
    sale_items: 2,
    customer_groups: 3,
    customer_group_members: 4,
    purchases: 1,
    purchase_items: 2,
    distribucion: 1,
    distribucion_items: 2,
  };

  sort(operations: SyncOperationInput[]): SortResult {
    const sortedOperations = [...operations].sort((a, b) => {
      const aKey = a.syncGroupId ?? "";
      const bKey = b.syncGroupId ?? "";
      if (aKey !== bKey) {
        return aKey > bKey ? 1 : -1;
      }

      const pA = this.entityPriority[a.entityType] ?? 99;
      const pB = this.entityPriority[b.entityType] ?? 99;
      if (pA !== pB) return pA - pB;

      return new Date(a.localTimestamp).getTime() - new Date(b.localTimestamp).getTime();
    });

    const groupCount = new Set(sortedOperations.map((op) => op.syncGroupId)).size;

    return {
      operations: sortedOperations,
      groupCount,
    };
  }

  getPriorityMap(): Record<string, number> {
    return { ...this.entityPriority };
  }
}
