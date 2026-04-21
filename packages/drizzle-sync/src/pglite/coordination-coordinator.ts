/**
 * Sync Coordinator
 *
 * Orchestrates push (SyncService) and pull (PullService) sync operations.
 * Manages lifecycle, auto-sync intervals, online/offline handling, and backoff.
 *
 * This is a generic coordinator that works with any implementation of
 * ISyncService and IPullService interfaces.
 */

import type { SyncStatus, ISyncLogger, ISyncEventEmitter, PullStaleEvent } from "../core";
import type { PullStatus } from "./types";
import { ExponentialBackoff } from "../core";

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Interface for sync (push) service operations
 */
export interface ISyncService {
  /** Initialize the service */
  initialize(): Promise<void>;

  /** Start auto-sync */
  startAutoSync(): void;

  /** Stop auto-sync */
  stopAutoSync(): void;

  /** Check if auto-sync is running */
  isRunning(): boolean;

  /** Reset backoff state */
  resetBackoff(): void;

  /** Process pending operations */
  processPending(ignoreOnlineCheck?: boolean): Promise<{
    processed: number;
    failed: number;
    conflicts: number;
  }>;

  /** Retry dead letter operations */
  retryAllDeadLetterOperations(): Promise<number>;

  /** Get current status */
  getStatus(): Promise<SyncStatus>;
}

/**
 * Interface for pull service operations
 */
export interface IPullService {
  /** Initialize the service */
  initialize(): Promise<void>;

  /** Start auto-pull */
  startAutoPull(): void;

  /** Stop auto-pull */
  stopAutoPull(): void;

  /** Check if auto-pull is running */
  isRunning(): boolean;

  /** Check if sync is stuck */
  getIsStuck(): boolean;

  /** Force reset when stuck */
  forceReset(): void;

  /** Execute a single pull */
  pull(): Promise<{
    success: boolean;
    changesApplied: number;
    hasMore: boolean;
    error?: string;
  }>;

  /** Get current status */
  getStatus(): PullStatus;
}

/**
 * Coordinator configuration options
 */
export interface SyncCoordinatorOptions {
  /** Interval for push sync in milliseconds (default: 5000) */
  pushIntervalMs?: number;

  /** Interval for pull sync in milliseconds (default: 10000) */
  pullIntervalMs?: number;

  /** Whether to enable auto-sync on start (default: true) */
  enableAutoSync?: boolean;

  /** Custom event emitter (optional) */
  events?: ISyncEventEmitter;

  /** Custom logger (optional) */
  logger?: ISyncLogger;
}

/**
 * Combined sync status from both push and pull services
 */
export interface SyncCoordinatorStatus {
  /** Push (sync) status */
  push: SyncStatus;
  /** Pull status */
  pull: PullStatus;
  /** Whether the coordinator is running */
  isRunning: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<SyncCoordinatorOptions> = {
  pushIntervalMs: 5000,
  pullIntervalMs: 10000,
  enableAutoSync: true,
  events: createNoOpEventEmitter(),
  logger: createNoOpLogger(),
};

// ============================================================================
// No-Op Implementations for Optional Dependencies
// ============================================================================

function createNoOpEventEmitter(): ISyncEventEmitter {
  return {
    on: () => () => {},
    once: () => {},
    emit: () => {},
    off: () => {},
    clear: () => {},
    hasListeners: () => false,
  };
}

function createNoOpLogger(): ISyncLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

// ============================================================================
// Sync Coordinator
// ============================================================================

/**
 * Sync Coordinator
 *
 * Orchestrates push and pull sync services, managing their lifecycle,
 * auto-sync intervals, and coordinating during online/offline transitions.
 */
export class SyncCoordinator {
  private readonly config: Required<SyncCoordinatorOptions>;
  private readonly pushBackoff: ExponentialBackoff;
  private readonly pullBackoff: ExponentialBackoff;
  private readonly events: ISyncEventEmitter;
  private readonly logger: ISyncLogger;

  private isRunning = false;
  private forceSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FORCE_SYNC_DEBOUNCE_MS = 1000;

  // Subscriptions
  private handleOnline: (() => void) | null = null;
  private handleOffline: (() => void) | null = null;
  private handlePullStaleUnsubscribe: (() => void) | null = null;
  private handleVisibilityChange: (() => void) | null = null;

  constructor(
    private syncService: ISyncService,
    private pullService: IPullService,
    options?: SyncCoordinatorOptions
  ) {
    this.config = { ...DEFAULT_OPTIONS, ...options };
    this.pushBackoff = new ExponentialBackoff();
    this.pullBackoff = new ExponentialBackoff();
    this.events = this.config.events;
    this.logger = this.config.logger;
  }

  /**
   * Start the sync coordinator
   *
   * Initializes both services and starts auto-sync if enabled.
   * Sets up online/offline and visibility change handlers.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    // Initialize services
    await this.syncService.initialize();
    await this.pullService.initialize();

    if (this.config.enableAutoSync) {
      this.syncService.startAutoSync();
      this.pullService.startAutoPull();
    }

    // Set up online/offline handlers
    this.handleOnline = this.onOnline.bind(this);
    this.handleOffline = this.onOffline.bind(this);

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }

    // Listen for stale pull events
    this.handlePullStaleUnsubscribe = this.events.on(
      "pull:stale",
      this.onPullStale.bind(this)
    );

    // Listen for page visibility changes
    if (typeof document !== "undefined") {
      this.handleVisibilityChange = () => {
        if (document.visibilityState === "visible" && typeof navigator !== "undefined" && navigator.onLine) {
          this.logger.info("[SyncCoordinator]", "Page became visible - resuming sync");
          this.pushBackoff.reset();
          this.pullBackoff.reset();
          this.syncService.resetBackoff();
          void this.handleNormalReconnect();
        }
      };
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.isRunning = true;
    this.events.emit("coordinator:started", { timestamp: new Date().toISOString() });
  }

  /**
   * Stop the sync coordinator
   *
   * Stops both services and removes all event handlers.
   */
  stop(): void {
    if (this.forceSyncTimer) {
      clearTimeout(this.forceSyncTimer);
      this.forceSyncTimer = null;
    }

    this.syncService.stopAutoSync();
    this.pullService.stopAutoPull();

    // Remove online/offline handlers
    if (typeof window !== "undefined") {
      if (this.handleOnline) {
        window.removeEventListener("online", this.handleOnline);
      }
      if (this.handleOffline) {
        window.removeEventListener("offline", this.handleOffline);
      }
    }

    // Remove pull:stale subscription
    if (this.handlePullStaleUnsubscribe) {
      this.handlePullStaleUnsubscribe();
      this.handlePullStaleUnsubscribe = null;
    }

    // Remove visibility change handler
    if (this.handleVisibilityChange) {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      }
      this.handleVisibilityChange = null;
    }

    this.isRunning = false;
  }

  /**
   * Handle online event
   */
  private async onOnline(): Promise<void> {
    this.logger.info("[SyncCoordinator]", "Online - resuming sync");
    this.events.emit("sync:online", { timestamp: new Date().toISOString() });

    // Reset backoffs IMMEDIATELY (not debounced)
    this.pushBackoff.reset();
    this.pullBackoff.reset();
    this.syncService.resetBackoff();

    // If pull service is stuck, force reset and skip normal reconnect flow
    if (this.pullService.getIsStuck()) {
      this.logger.warn("[SyncCoordinator]", "Sync was stuck - forcing reset");
      await this.forceResetSync();
      return;
    }

    // Normal reconnect
    await this.handleNormalReconnect();
  }

  /**
   * Handle normal reconnect flow
   */
  private async handleNormalReconnect(): Promise<void> {
    // Restart services if they were stopped
    if (!this.syncService.isRunning()) {
      this.logger.info("[SyncCoordinator]", "Restarting sync service");
      this.syncService.startAutoSync();
    }
    if (!this.pullService.isRunning()) {
      this.logger.info("[SyncCoordinator]", "Restarting pull service");
      this.pullService.startAutoPull();
    }

    const retried = await this.syncService.retryAllDeadLetterOperations();
    if (retried > 0) {
      this.logger.info("[SyncCoordinator]", `Re-enqueued ${retried} DLQ operations`);
    }

    // Debounce forceSync to handle rapid online/offline events
    if (this.forceSyncTimer) {
      clearTimeout(this.forceSyncTimer);
    }
    this.forceSyncTimer = setTimeout(() => {
      this.forceSyncTimer = null;
      void this.forceSync();
    }, this.FORCE_SYNC_DEBOUNCE_MS);
  }

  /**
   * Handle offline event
   */
  private onOffline(): void {
    this.logger.warn("[SyncCoordinator]", "Offline - pausing sync");
    this.events.emit("sync:offline", { timestamp: new Date().toISOString() });
  }

  /**
   * Handle pull stale event
   */
  private onPullStale(event: PullStaleEvent): void {
    this.logger.error(
      "[SyncCoordinator]",
      `Pull sync is stuck: ${event.reason} after ${event.consecutiveStalePulls} pulls`
    );
    // Stop auto-pull - it will be restarted when user manually resets
    this.pullService.stopAutoPull();
    this.syncService.stopAutoSync();
  }

  /**
   * Force a sync (both push and pull)
   *
   * Used for manual sync triggers.
   */
  async forceSync(): Promise<void> {
    await this.syncService.processPending(true); // ignoreOnlineCheck: true
    await this.pullService.pull();
  }

  /**
   * Force reset sync when stuck
   *
   * Clears cursor and restarts auto-sync.
   */
  async forceResetSync(): Promise<void> {
    this.logger.warn("[SyncCoordinator]", "Force reset sync");
    this.pullService.forceReset();
    this.syncService.startAutoSync();
  }

  /**
   * Get combined status from both services
   */
  async getCombinedStatus(): Promise<SyncCoordinatorStatus> {
    return {
      push: await this.syncService.getStatus(),
      pull: this.pullService.getStatus(),
      isRunning: this.isRunning,
    };
  }
}

/**
 * Create a new sync coordinator instance
 */
export function createSyncCoordinator(
  syncService: ISyncService,
  pullService: IPullService,
  options?: SyncCoordinatorOptions
): SyncCoordinator {
  return new SyncCoordinator(syncService, pullService, options);
}
