import { describe, expect, it } from "vitest";
import { getEntityPriority } from "@avileo/shared";
import { OperationSorter } from "../OperationSorter";
import type { SyncOperationInput } from "../../types";

function makeOperation(
  overrides: Partial<SyncOperationInput> &
    Pick<SyncOperationInput, "idempotencyKey" | "entityType" | "entityId" | "localTimestamp">
): SyncOperationInput {
  return {
    idempotencyKey: overrides.idempotencyKey,
    entityType: overrides.entityType,
    entityId: overrides.entityId,
    operation: overrides.operation ?? "create",
    payload: overrides.payload ?? {},
    localVersion: overrides.localVersion ?? 1,
    localTimestamp: overrides.localTimestamp,
    syncGroupId: overrides.syncGroupId,
    correlationId: overrides.correlationId,
  };
}

describe("OperationSorter", () => {
  it("should sort parents before children", () => {
    const sorter = new OperationSorter();

    const operations: SyncOperationInput[] = [
      makeOperation({
        idempotencyKey: "i1",
        entityType: "sale_items",
        entityId: "si-1",
        syncGroupId: "g1",
        localTimestamp: "2026-03-30T10:00:01.000Z",
      }),
      makeOperation({
        idempotencyKey: "i2",
        entityType: "sales",
        entityId: "s-1",
        syncGroupId: "g1",
        localTimestamp: "2026-03-30T10:00:02.000Z",
      }),
    ];

    const result = sorter.sort(operations);

    expect(result.operations[0].entityType).toBe("sales");
    expect(result.operations[1].entityType).toBe("sale_items");
    expect(result.groupCount).toBe(1);
  });

  it("should use shared priorities for ordering semantics", () => {
    const sorter = new OperationSorter();

    const operations: SyncOperationInput[] = [
      makeOperation({
        idempotencyKey: "i1",
        entityType: "purchase_items",
        entityId: "pi-1",
        syncGroupId: "g-orders",
        localTimestamp: "2026-03-30T10:00:03.000Z",
      }),
      makeOperation({
        idempotencyKey: "i2",
        entityType: "purchases",
        entityId: "p-1",
        syncGroupId: "g-orders",
        localTimestamp: "2026-03-30T10:00:04.000Z",
      }),
      makeOperation({
        idempotencyKey: "i3",
        entityType: "customer_group_members",
        entityId: "cgm-1",
        syncGroupId: "g-groups",
        localTimestamp: "2026-03-30T10:00:05.000Z",
      }),
      makeOperation({
        idempotencyKey: "i4",
        entityType: "customer_groups",
        entityId: "cg-1",
        syncGroupId: "g-groups",
        localTimestamp: "2026-03-30T10:00:06.000Z",
      }),
    ];

    const result = sorter.sort(operations);
    const grouped = new Map<string, SyncOperationInput[]>();

    for (const operation of result.operations) {
      const groupKey = operation.syncGroupId ?? "";
      const current = grouped.get(groupKey) ?? [];
      grouped.set(groupKey, [...current, operation]);
    }

    for (const groupOperations of grouped.values()) {
      for (let index = 0; index < groupOperations.length - 1; index += 1) {
        const current = groupOperations[index];
        const next = groupOperations[index + 1];

        expect(getEntityPriority(current.entityType)).toBeLessThanOrEqual(
          getEntityPriority(next.entityType)
        );
      }
    }
  });
});
