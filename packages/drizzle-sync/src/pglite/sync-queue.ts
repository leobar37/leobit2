/**
 * Sync Queue Interface
 *
 * Defines the contract for managing the sync operations queue.
 * This abstraction allows for different implementations (PGlite, in-memory, etc.)
 * and enables easier testing.
 *
 * This is a re-export of the ISyncQueue interface from types.ts for backward
 * compatibility with packages/app/app/lib/sync/queue/sync-queue.ts.
 */

import type { ISyncQueue, QueueOptions } from "./types";

// Re-export the interface and type
export type { ISyncQueue, QueueOptions };
