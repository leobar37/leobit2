/**
 * Coalescing Logic
 *
 * Re-exports coalescing utilities from @avileo/drizzle-sync/core.
 *
 * @module sync/queue/coalesce
 */

export {
  mergeArrayById,
  deepMerge,
  getCoalescePlan,
  canCoalesce,
  type CoalescePlanType,
  type CoalescePlan,
} from "@avileo/drizzle-sync/core";

// Re-export parsePayload for backward compatibility with tests
export { parsePayload } from "@avileo/drizzle-sync/core";
