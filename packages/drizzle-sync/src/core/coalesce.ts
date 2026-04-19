/**
 * Operation Coalescing Logic
 *
 * Handles merging multiple operations on the same entity into a single operation.
 * Pure JavaScript logic - testable and maintainable.
 *
 * Rules:
 * - create + create/update → merge into create (combine payloads)
 * - create + delete → cancel (entity never existed on server)
 * - update + update → merge into update (combine payloads)
 * - update + delete → replace with delete
 * - delete + create → replace with update (recreate)
 */

import type { SyncOperationRecord, EnqueueParams } from "./types";

/**
 * Coalescing plan type
 */
export type CoalescePlanType =
  | "cancel"
  | "merge"
  | "replace"
  | "keep-existing"
  | "none";

/**
 * Coalescing plan result
 */
export interface CoalescePlan {
  /** Plan type */
  type: CoalescePlanType;
  /** Resulting operation type (if not cancel) */
  operation?: "create" | "update" | "delete";
  /** Merged payload (if merge) */
  payload?: Record<string, unknown>;
}

/**
 * Merge two arrays of objects by their `id` field.
 *
 * Items in `b` that already exist in `a` (by id) are replaced;
 * items in `b` that don't exist in `a` are appended.
 * Maintains original order from `a` plus new items from `b`.
 */
export function mergeArrayById<T extends { id: string }>(
  a: T[],
  b: T[]
): T[] {
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
 *
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
      aVal[0] !== null &&
      bVal[0] !== null &&
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
 * Parse payload from string or object.
 *
 * @param payload Raw payload (string or object)
 * @returns Parsed payload object
 */
export function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Get coalescing plan for merging operations.
 *
 * Rules:
 * - create + create/update → merge into create (combine payloads)
 * - create + delete → cancel (entity never existed on server)
 * - update + update → merge into update (combine payloads)
 * - update + delete → replace with delete
 * - delete + create → replace with update (recreate)
 * - anything else → none (no coalescing)
 *
 * @param existing Existing pending operation
 * @param incoming New operation parameters
 * @returns Coalescing plan
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

  // Existing is delete: can replace with create (becomes update/recreate)
  if (existing.operation === "delete") {
    if (incoming.operation === "create") {
      return {
        type: "replace",
        operation: "update",
        payload: incoming.data,
      };
    }
  }

  // No coalescing possible
  return { type: "none" };
}

/**
 * Check if two operations can be coalesced.
 *
 * @param existing Existing pending operation
 * @param incoming New operation parameters
 * @returns True if coalescing is possible
 */
export function canCoalesce(
  existing: SyncOperationRecord,
  incoming: EnqueueParams
): boolean {
  const plan = getCoalescePlan(existing, incoming);
  return plan.type !== "none";
}
