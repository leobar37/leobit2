import { describe, it, expect, beforeEach } from "vitest";
import { OperationSorter } from "./operation-sorter";
import type { SyncOperationInput } from "./types";

describe("operation-sorter", () => {
  let sorter: OperationSorter;

  beforeEach(() => {
    sorter = new OperationSorter();
  });

  const makeOp = (
    partial: {
      idempotencyKey: string;
      entityType?: string;
      entityId?: string;
      operation?: "create" | "update" | "delete";
    } & Partial<Omit<SyncOperationInput, "idempotencyKey" | "entityType" | "entityId" | "operation">>
  ): SyncOperationInput => {
    const defaults: SyncOperationInput = {
      idempotencyKey: "",
      entityType: "sales",
      entityId: "",
      operation: "create",
      payload: {},
      localVersion: 1,
      localTimestamp: new Date().toISOString(),
    };
    return { ...defaults, ...partial } as SyncOperationInput;
  };

  describe("sort", () => {
    it("sorts by syncGroupId first", () => {
      const ops = [
        makeOp({ idempotencyKey: "b", syncGroupId: "group-2", localTimestamp: "2024-01-01T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1", localTimestamp: "2024-01-01T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "c", syncGroupId: "group-1", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      expect(result.operations[0].idempotencyKey).toBe("a");
      expect(result.operations[1].idempotencyKey).toBe("c");
      expect(result.operations[2].idempotencyKey).toBe("b");
    });

    it("sorts by entity priority within same syncGroupId", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1", entityType: "sale_items", localTimestamp: "2024-01-01T00:00:01.000Z" }),
        makeOp({ idempotencyKey: "b", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      // sales (priority 1) should come before sale_items (priority 2)
      expect(result.operations[0].idempotencyKey).toBe("b");
      expect(result.operations[1].idempotencyKey).toBe("a");
    });

    it("sorts by localTimestamp as tiebreaker within same priority", () => {
      const ops = [
        makeOp({ idempotencyKey: "later", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-02T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "earlier", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      expect(result.operations[0].idempotencyKey).toBe("earlier");
      expect(result.operations[1].idempotencyKey).toBe("later");
    });

    it("handles operations without syncGroupId", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: undefined, entityType: "sale_items" }),
        makeOp({ idempotencyKey: "b", syncGroupId: undefined, entityType: "sales" }),
      ];

      const result = sorter.sort(ops);
      // sales (priority 1) should come first
      expect(result.operations[0].idempotencyKey).toBe("b");
      expect(result.operations[1].idempotencyKey).toBe("a");
    });

    it("does not mutate original array", () => {
      const ops = [
        makeOp({ idempotencyKey: "b", syncGroupId: "group-2" }),
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1" }),
      ];
      const original = [...ops];
      sorter.sort(ops);
      expect(ops[0].idempotencyKey).toBe("b");
      expect(ops[1].idempotencyKey).toBe("a");
    });

    it("returns correct groupCount", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1" }),
        makeOp({ idempotencyKey: "b", syncGroupId: "group-1" }),
        makeOp({ idempotencyKey: "c", syncGroupId: "group-2" }),
      ];

      const result = sorter.sort(ops);
      expect(result.groupCount).toBe(2);
    });

    it("handles empty array", () => {
      const result = sorter.sort([]);
      expect(result.operations).toEqual([]);
      expect(result.groupCount).toBe(0);
    });

    it("handles single operation", () => {
      const ops = [makeOp({ idempotencyKey: "a", syncGroupId: "group-1" })];
      const result = sorter.sort(ops);
      expect(result.operations).toHaveLength(1);
      expect(result.groupCount).toBe(1);
    });

    it("sorts mixed syncGroupId and priority correctly", () => {
      const ops = [
        makeOp({ idempotencyKey: "1", syncGroupId: "B", entityType: "sale_items" }),
        makeOp({ idempotencyKey: "2", syncGroupId: "A", entityType: "sales" }),
        makeOp({ idempotencyKey: "3", syncGroupId: "A", entityType: "sale_items" }),
        makeOp({ idempotencyKey: "4", syncGroupId: "B", entityType: "sales" }),
      ];

      const result = sorter.sort(ops);
      // Group A comes first, then Group B (group-1)
      // Within Group A: sales (priority 1) before sale_items (priority 2)
      // Within Group B: sales (priority 1) before sale_items (priority 2)
      expect(result.operations[0].idempotencyKey).toBe("2"); // Group A, sales
      expect(result.operations[1].idempotencyKey).toBe("3"); // Group A, sale_items
      expect(result.operations[2].idempotencyKey).toBe("4"); // Group B, sales
      expect(result.operations[3].idempotencyKey).toBe("1"); // Group B, sale_items
    });
  });

  describe("getPriorityMap", () => {
    it("returns ENTITY_PRIORITIES copy", () => {
      const map = sorter.getPriorityMap();
      expect(map["sales"]).toBe(1);
      expect(map["sale_items"]).toBe(2);
    });

    it("returns a copy (mutation does not affect original)", () => {
      const map1 = sorter.getPriorityMap();
      const map2 = sorter.getPriorityMap();
      expect(map1).not.toBe(map2);
    });
  });
});
