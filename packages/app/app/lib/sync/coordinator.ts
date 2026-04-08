import { type PullStatus, PullService } from "./pull-service";
import { type SyncStatus, SyncService } from "./sync-service";
import { syncEvents } from "./sync-events";
import { syncLogger } from "./sync-logger";
import { ExponentialBackoff } from "./backoff";

export interface SyncCoordinatorConfig {
  pushIntervalMs: number;
  pullIntervalMs: number;
  enableAutoSync: boolean;
}

const DEFAULT_CONFIG: SyncCoordinatorConfig = {
  pushIntervalMs: 5000,
  pullIntervalMs: 10000,
  enableAutoSync: true,
};

export class SyncCoordinator {
  private config: SyncCoordinatorConfig;
  private pushBackoff: ExponentialBackoff;
  private pullBackoff: ExponentialBackoff;
  private isRunning = false;
  private forceSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FORCE_SYNC_DEBOUNCE_MS = 1000;
  private handlePullStaleSubscription: (() => void) | null = null;

  constructor(
    private syncService: SyncService,
    private pullService: PullService,
    config?: Partial<SyncCoordinatorConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pushBackoff = new ExponentialBackoff();
    this.pullBackoff = new ExponentialBackoff();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    // Initialize services
    await this.syncService.initialize();
    await this.pullService.initialize();

    if (this.config.enableAutoSync) {
      this.syncService.startAutoSync();
      this.pullService.startAutoPull();
    }

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Listen for stale pull events
    this.handlePullStaleSubscription = syncEvents.on("pull:stale", this.handlePullStale);

    this.isRunning = true;
    syncEvents.emit("coordinator:started", undefined);
  }

  stop(): void {
    if (this.forceSyncTimer) {
      clearTimeout(this.forceSyncTimer);
      this.forceSyncTimer = null;
    }
    this.syncService.stopAutoSync();
    this.pullService.stopAutoPull();

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    // Unsubscribe from pull:stale events
    if (this.handlePullStaleSubscription) {
      this.handlePullStaleSubscription();
      this.handlePullStaleSubscription = null;
    }

    this.isRunning = false;
  }

  private handleOnline = (): void => {
    console.log("[SyncCoordinator] Online - resuming sync");
    syncEvents.emit("sync:online", undefined);

    // Reset backoffs IMMEDIATELY (not debounced)
    this.pushBackoff.reset();
    this.pullBackoff.reset();

    // Debounce forceSync to handle rapid online/offline events
    if (this.forceSyncTimer) {
      clearTimeout(this.forceSyncTimer);
    }
    this.forceSyncTimer = setTimeout(() => {
      this.forceSyncTimer = null;
      this.forceSync();
    }, this.FORCE_SYNC_DEBOUNCE_MS);
  };

  private handleOffline = (): void => {
    console.log("[SyncCoordinator] Offline - pausing sync");
    syncEvents.emit("sync:offline", undefined);
  };

  private handlePullStale = ({ consecutiveStalePulls, reason }: { consecutiveStalePulls: number; reason: 'cursor-stuck' | 'empty-pulls' }): void => {
    syncLogger.error('[SyncCoordinator]', `Pull sync is stuck: ${reason} after ${consecutiveStalePulls} pulls`);
    // Stop auto-pull - it will be restarted when user manually resets
    this.pullService.stopAutoPull();
    this.syncService.stopAutoSync();
  };

  async forceSync(): Promise<void> {
    await this.syncService.processPending();
    await this.pullService.pull();
  }

  /**
   * Force reset sync when stuck
   * Clears cursor and restarts auto-sync
   */
  async forceResetSync(): Promise<void> {
    console.log("[SyncCoordinator] Force reset sync");
    this.pullService.forceReset();
    this.syncService.startAutoSync();
  }

  async getCombinedStatus(): Promise<{
    push: SyncStatus;
    pull: PullStatus;
    isRunning: boolean;
  }> {
    return {
      push: await this.syncService.getStatus(),
      pull: this.pullService.getStatus(),
      isRunning: this.isRunning,
    };
  }
}
