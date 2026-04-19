/**
 * React Runtime Types
 *
 * Core types for the React integration layer.
 * These types are designed to be generic and reusable across different sync implementations.
 */

/**
 * Generic event source interface for subscribing to events.
 * Allows different event systems (native EventTarget, custom emitters, etc.)
 */
export interface SyncEventSource {
  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  on(eventType: string, handler: (event: unknown) => void): () => void;
}

/**
 * Push sync status snapshot for detailed push state.
 * Libraries can extend this with additional fields as needed.
 */
export interface PushStateSnapshot {
  /** Whether push is currently processing */
  isProcessing: boolean;
  /** Number of pending operations */
  pendingCount: number;
  /** Number of processing operations */
  processingCount: number;
  /** Number of syncing operations */
  syncingCount: number;
  /** Number of completed operations */
  completedCount: number;
  /** Number of failed operations */
  failedCount: number;
  /** Number of conflict operations */
  conflictCount: number;
  /** Number of dead letter operations */
  deadLetterCount: number;
  /** Total operations in queue */
  totalCount: number;
}

/**
 * Pull sync status snapshot for detailed pull state.
 * Libraries can extend this with additional fields as needed.
 */
export interface PullStateSnapshot {
  /** Whether pull is currently in progress */
  isPulling: boolean;
  /** Last successful pull time */
  lastPullTime: Date | null;
  /** Last error message */
  lastError: string | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Current cursor position */
  cursor: string | null;
  /** Whether pull is stuck (cursor not advancing) */
  isStuck: boolean;
  /** Number of consecutive stale pulls */
  consecutiveStalePulls: number;
}

/**
 * Base sync state snapshot suitable for React consumption.
 * Libraries can extend this with additional fields as needed.
 */
export interface SyncStateSnapshot {
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Whether the app is online */
  isOnline: boolean;
  /** Whether sync is stuck and needs manual intervention */
  isStuck: boolean;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Number of pending operations */
  pendingCount: number;
  /** Number of failed operations */
  failedCount: number;
  /** Number of conflict operations */
  conflictCount: number;
  /** Number of dead letter operations */
  deadLetterCount: number;
  /** Detailed push state (optional, populated by app runtime) */
  push?: PushStateSnapshot;
  /** Detailed pull state (optional, populated by app runtime) */
  pull?: PullStateSnapshot;
}

/**
 * Log entry for sync operations
 */
export interface SyncLogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: "debug" | "info" | "warn" | "error";
  /** Log message */
  message: string;
  /** Optional additional data */
  data?: Record<string, unknown>;
}

/**
 * Conflict record for UI display
 */
export interface SyncConflictRecord {
  /** Unique identifier */
  id: string;
  /** Entity type */
  entityType: string;
  /** Entity instance ID */
  entityId: string;
  /** Client's data */
  localData: Record<string, unknown>;
  /** Server's data */
  serverData: Record<string, unknown>;
  /** Client's version number */
  localVersion: number;
  /** Server's version number */
  serverVersion: number;
  /** Conflict status */
  status: "pending" | "resolved";
  /** Resolution chosen */
  resolution: "server" | "local" | "merge" | null;
}

/**
 * Runtime interface for React integration.
 * Provides state access, subscription, and lifecycle management.
 */
export interface SyncReactRuntime {
  /**
   * Get current sync state snapshot
   */
  getState(): SyncStateSnapshot;

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void;

  /**
   * Optional event source for subscribing to specific events
   */
  eventSource?: SyncEventSource;

  /**
   * Get current logs (if available)
   */
  getLogs?(): SyncLogEntry[];

  /**
   * Subscribe to log changes (if available)
   * @returns Unsubscribe function
   */
  subscribeLogs?(listener: () => void): () => void;

  /**
   * Get current conflicts (if available)
   */
  getConflicts?(): SyncConflictRecord[];

  /**
   * Subscribe to conflict changes (if available)
   * @returns Unsubscribe function
   */
  subscribeConflicts?(listener: () => void): () => void;

  /**
   * Dispose of the runtime and clean up resources
   */
  dispose?(): void;
}

/**
 * Factory function type for creating a SyncReactRuntime
 */
export type SyncReactRuntimeFactory = () => SyncReactRuntime | Promise<SyncReactRuntime>;
