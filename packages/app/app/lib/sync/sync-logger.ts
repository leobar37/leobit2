/**
 * Sync Logger
 *
 * Re-exported from @avileo/drizzle-sync/pglite for backwards compatibility.
 *
 * @deprecated Import directly from "@avileo/drizzle-sync/pglite" instead.
 *
 * Usage:
 *   import { syncLogger } from "~/lib/sync/sync-logger";
 *   syncLogger.info("[PgSyncQueue]", "Enqueued operation", { id: "123" });
 */

export { SyncLogger, syncLogger } from "@avileo/drizzle-sync/pglite";

// Re-export types for backwards compatibility
export type { SyncLogLevel, SyncLogEntry } from "@avileo/drizzle-sync/pglite";
