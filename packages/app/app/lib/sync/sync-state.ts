/**
 * SyncState type definition
 *
 * Extracted to avoid circular imports between engine-provider and service-provider.
 */

import type { SyncStatus } from "../sync/sync-service";
import type { PullStatus } from "../sync/pull-service";

export interface SyncState {
  /** Pull sync status (server to client) */
  pull: PullStatus;
  /** Push sync status (client to server) */
  push: SyncStatus;
  /** Whether any sync is in progress */
  isSyncing: boolean;
  /** Whether the app is online */
  isOnline: boolean;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Whether sync is stuck and needs manual intervention */
  isStuck: boolean;
}
