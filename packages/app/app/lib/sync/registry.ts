/**
 * Sync Hooks Registry
 * Central registry for all sync hooks
 */
import type { PGlite } from "@electric-sql/pglite";
import type { SyncHook, SyncHookContext, SyncHookResult } from "./create-sync-hook";
/**
 * All registered sync hooks
 */
const registeredHooks: SyncHook[] = [
  // TODO: add hooks here
];

/**
 * Runs all hooks for a given entity type
 * Returns the first non-allowing result, or allows if all pass
 */
export async function runSyncHooks(
  entityType: string,
  context: SyncHookContext,
  options: { pg: PGlite; businessId: string }
): Promise<SyncHookResult> {
  const hooks = registeredHooks.filter((hook) => hook.entityType === entityType);

  for (const hook of hooks) {
    const result = await hook.condition(context, options);
    if (!result.allow) {
      return result;
    }
  }

  return { allow: true };
}

/**
 * Gets all registered hooks (for debugging/inspection)
 */
export function getRegisteredHooks(): SyncHook[] {
  return [...registeredHooks];
}
