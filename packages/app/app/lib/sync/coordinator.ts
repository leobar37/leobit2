import { type PullStatus, PullService } from "./pull-service";
import { type SyncStatus, SyncService } from "./sync-service";

export class SyncCoordinator {
  constructor(
    private syncService: SyncService,
    private pullService: PullService,
  ) {}

  start(): void {
    this.syncService.startAutoSync();
    this.pullService.startAutoPull();
  }

  stop(): void {
    this.syncService.stopAutoSync();
    this.pullService.stopAutoPull();
  }

  async getCombinedStatus(): Promise<{
    push: SyncStatus;
    pull: PullStatus;
  }> {
    return {
      push: await this.syncService.getStatus(),
      pull: this.pullService.getStatus(),
    };
  }

  async forceSync(): Promise<void> {
    await this.syncService.processPending();
    await this.pullService.pull();
  }
}
