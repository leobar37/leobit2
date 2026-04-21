import { createId } from "@paralleldrive/cuid2";
import { SyncConfigBuilder } from "./builder";
import type { SyncConfigInput, EntitySyncConfig } from "./types";

/**
 * Create a type-safe sync configuration
 * This is the main entry point for defining sync entities
 */
export function defineSyncConfig<TEntities extends Record<string, EntitySyncConfig>>(
  config: SyncConfigInput<TEntities>
): SyncConfigBuilder<TEntities> {
  return new SyncConfigBuilder(config);
}

/**
 * Generate a CUID2 ID for frontend use
 * Exported for use in generated hooks
 */
export { createId };

/**
 * Utility to generate sync group ID (for batching operations)
 */
export function generateSyncGroupId(): string {
  return createId();
}

/**
 * Utility to generate idempotency key
 */
export function generateIdempotencyKey(): string {
  return createId();
}
