import { describe, it, expect, vi } from "vitest";
import {
  getCoalescePlan,
  canCoalesce,
  deepMerge,
  mergeArrayById,
  parsePayload,
} from "./coalesce";
import type { SyncOperationRecord } from "./types";

describe("coalesce", () => {
  const makeOp = (
    operation: "create" | "update" | "delete",
    payload: Record<string, unknown> = {}
  ): SyncOperationRecord => ({
    id: "op-1",
    operationId: "op-1",
    status: "pending",
    processedAt: null,
    payload,
    operation, // MISSING — this is what coalesce.ts checks
  } as unknown as SyncOperationRecord);

  describe("getCoalescePlan", () => {
    it("returns cancel when create + delete", () => {
      const existing = makeOp("create", { name: "test" });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "delete" as const, data: {} };
      expect(getCoalescePlan(existing, incoming)).toEqual({ type: "cancel" });
    });

    it("returns merge with create operation when create + create", () => {
      const existing = makeOp("create", { name: "test", qty: 1 });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "create" as const, data: { name: "updated", qty: 2 } };
      const result = getCoalescePlan(existing, incoming);
      expect(result.type).toBe("merge");
      expect(result.operation).toBe("create");
      expect(result.payload).toEqual({ name: "updated", qty: 2 });
    });

    it("returns merge with create operation when create + update", () => {
      const existing = makeOp("create", { name: "test" });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "update" as const, data: { name: "updated" } };
      const result = getCoalescePlan(existing, incoming);
      expect(result.type).toBe("merge");
      expect(result.operation).toBe("create");
      expect(result.payload).toEqual({ name: "updated" });
    });

    it("returns merge when update + update", () => {
      const existing = makeOp("update", { name: "v1" });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "update" as const, data: { name: "v2" } };
      const result = getCoalescePlan(existing, incoming);
      expect(result.type).toBe("merge");
      expect(result.operation).toBe("update");
      expect(result.payload).toEqual({ name: "v2" });
    });

    it("returns replace with delete when update + delete", () => {
      const existing = makeOp("update", { name: "test" });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "delete" as const, data: {} };
      const result = getCoalescePlan(existing, incoming);
      expect(result.type).toBe("replace");
      expect(result.operation).toBe("delete");
    });

    it("returns replace with update when delete + create", () => {
      const existing = makeOp("delete", {});
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "create" as const, data: { name: "new" } };
      const result = getCoalescePlan(existing, incoming);
      expect(result.type).toBe("replace");
      expect(result.operation).toBe("update");
      expect(result.payload).toEqual({ name: "new" });
    });

    it("returns none when operations are incompatible", () => {
      const existing = makeOp("update", { name: "test" });
      const incoming = { entity_type: "sales", entityId: "entity-1", operation: "create" as const, data: { name: "new" } };
      expect(getCoalescePlan(existing, incoming)).toEqual({ type: "none" });
    });
  });

  describe("canCoalesce", () => {
    it("returns true for coalescable operations", () => {
      const existing = makeOp("create");
      const incoming = { entity_type: "sales", entityId: "e1", operation: "update" as const, data: {} };
      expect(canCoalesce(existing, incoming)).toBe(true);
    });

    it("returns false for non-coalescable operations", () => {
      const existing = makeOp("update");
      const incoming = { entity_type: "sales", entityId: "e1", operation: "create" as const, data: {} };
      expect(canCoalesce(existing, incoming)).toBe(false);
    });
  });

  describe("deepMerge", () => {
    it("shallow-merges top-level keys", () => {
      const a = { name: "a", count: 1 };
      const b = { name: "b", count: 2 };
      expect(deepMerge(a, b)).toEqual({ name: "b", count: 2 });
    });

    it("replaces non-object values", () => {
      const a = { name: "original", count: 1 };
      const b = { name: "new", count: 99 };
      expect(deepMerge(a, b)).toEqual({ name: "new", count: 99 });
    });
  });

  describe("mergeArrayById", () => {
    it("merges arrays by id, replacing existing items", () => {
      const a = [{ id: "1", name: "a" }, { id: "2", name: "b" }];
      const b = [{ id: "2", name: "bb" }, { id: "3", name: "c" }];
      expect(mergeArrayById(a, b)).toEqual([
        { id: "1", name: "a" },
        { id: "2", name: "bb" },
        { id: "3", name: "c" },
      ]);
    });

    it("returns copy of a when b is empty", () => {
      const a = [{ id: "1", name: "a" }];
      expect(mergeArrayById(a, [])).toEqual([{ id: "1", name: "a" }]);
    });
  });

  describe("parsePayload", () => {
    it("returns empty object for null/undefined", () => {
      expect(parsePayload(null)).toEqual({});
      expect(parsePayload(undefined)).toEqual({});
    });

    it("parses JSON string", () => {
      expect(parsePayload('{"name":"test"}')).toEqual({ name: "test" });
    });

    it("returns object as-is", () => {
      const obj = { name: "test" };
      expect(parsePayload(obj)).toEqual(obj);
    });

    it("returns empty object for invalid JSON string", () => {
      expect(parsePayload("not json")).toEqual({});
    });
  });
});
