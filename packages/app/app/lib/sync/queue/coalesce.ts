/**
 * Coalescing logic for sync operations
 *
 * Handles merging multiple operations on the same entity into a single operation.
 * Pure JavaScript logic - testable and maintainable.
 */

import type { SyncOperationRecord, EnqueueParams } from "../types";
import { parsePayload } from "../types";

/**
 * Coalescing plan result
 */
export type CoalescePlan =
  | { type: "merge"; operation: "create" | "update" | "delete"; payload: Record<string, unknown> }
  | { type: "replace"; operation: "create" | "update" | "delete"; payload: Record<string, unknown> }
  | { type: "cancel" }
  | { type: "none" };

/**
 * Merge two arrays of objects by their `id` field.
 * Items in `b` that already exist in `a` (by id) are replaced;
 * items in `b` that don't exist in `a` are appended.
 * Maintains original order from `a` plus new items from `b`.
 */
export function mergeArrayById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const result = [...a];

  for (const item of b) {
    const idx = result.findIndex((r) => r.id === item.id);
    if (idx >= 0) {
      result[idx] = item;
    } else {
      result.push(item);
    }
  }

  return result;
}

/**
 * Recursively deep-merges `b` into `a`.
 * Arrays are merged by `id` field using `mergeArrayById`.
 * Primitives and other values in `b` overwrite `a`.
 */
export function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };

  for (const key of Object.keys(b)) {
    const aVal = a[key];
    const bVal = b[key];

    if (
      Array.isArray(aVal) &&
      Array.isArray(bVal) &&
      aVal.length > 0 &&
      bVal.length > 0 &&
      typeof aVal[0] === "object" &&
      typeof bVal[0] === "object" &&
      "id" in (aVal[0] as Record<string, unknown>) &&
      "id" in (bVal[0] as Record<string, unknown>)
    ) {
      result[key] = mergeArrayById(
        aVal as { id: string }[],
        bVal as { id: string }[]
      );
    } else {
      result[key] = bVal;
    }
  }

  return result;
}

/**
 * Get coalescing plan for merging operations.
 *
 * Rules:
 * - create + create/update → merge into create (combine payloads)
 * - create + delete → cancel (entity never existed on server)
 * - update + update → merge into update (combine payloads)
 * - update + delete → replace with delete
 * - anything else → none (no coalescing)
 */
export function getCoalescePlan(
  existing: SyncOperationRecord,
  incoming: EnqueueParams
): CoalescePlan {
  const existingPayload = parsePayload(existing.payload);

  // Existing is create: can merge with create/update or cancel with delete
  if (existing.operation === "create") {
    if (incoming.operation === "create" || incoming.operation === "update") {
      return {
        type: "merge",
        operation: "create",
        payload: deepMerge(existingPayload, incoming.data),
      };
    }
    if (incoming.operation === "delete") {
      return { type: "cancel" };
    }
  }

  // Existing is update: can merge with update or replace with delete
  if (existing.operation === "update") {
    if (incoming.operation === "update") {
      return {
        type: "merge",
        operation: "update",
        payload: deepMerge(existingPayload, incoming.data),
      };
    }
    if (incoming.operation === "delete") {
      return {
        type: "replace",
        operation: "delete",
        payload: incoming.data,
      };
    }
  }

  // No coalescing possible
  return { type: "none" };
}
