import { type PullStatus, PullService } from "./pull-service";
import { type SyncStatus, SyncService } from "./sync-service";
import { syncEvents } from "./sync-events";
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

    this.isRunning = true;
    syncEvents.emit("coordinator:started", undefined);
  }

  stop(): void {
    this.syncService.stopAutoSync();
    this.pullService.stopAutoPull();

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    this.isRunning = false;
  }

  private handleOnline = (): void => {
    console.log("[SyncCoordinator] Online - resuming sync");
    syncEvents.emit("sync:online", undefined);
    this.pushBackoff.reset();
    this.pullBackoff.reset();
    
    // Trigger immediate sync
    this.forceSync();
  };

  private handleOffline = (): void => {
    console.log("[SyncCoordinator] Offline - pausing sync");
    syncEvents.emit("sync:offline", undefined);
  };

  async forceSync(): Promise<void> {
    await this.syncService.processPending();
    await this.pullService.pull();
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
