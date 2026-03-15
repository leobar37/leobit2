/**
 * Electric Sync Engine
 * Handles sync shapes from PostgreSQL to PGlite using ElectricSQL
 */
import type { PGliteWithElectric, SyncTableResult } from "~/lib/sync/sync-shapes";
import { syncTables, stopAllSyncs } from "~/lib/sync/sync-shapes";
import { getShapesByPriority } from "~/lib/sync/shape-config";

export interface ElectricSyncConfig {
  pg: PGliteWithElectric;
  businessId: string;
  token: string;
  onTableSync?: (table: string, success: boolean, error?: string) => void;
  onSyncComplete?: (result: { success: string[]; failed: string[] }) => void;
}

export interface ElectricSyncState {
  isSyncing: boolean;
  tables: Map<
    string,
    {
      isReady: boolean;
      error?: string;
    }
  >;
}

interface SyncManagerState {
  currentSyncResults: SyncTableResult[];
  isSyncing: boolean;
  businessId: string | null;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000;

class ElectricSyncManager {
  private state: SyncManagerState = {
    currentSyncResults: [],
    isSyncing: false,
    businessId: null,
  };

  private getState(): Readonly<SyncManagerState> {
    return { ...this.state };
  }

  private setState(changes: Partial<SyncManagerState>): void {
    this.state = { ...this.state, ...changes };
  }

  async startSync(config: ElectricSyncConfig): Promise<() => void> {
    const { pg, businessId, onTableSync, onSyncComplete } = config;

    console.log(`[ELECTRIC-ENGINE] startSync called for business: ${businessId}`);
    console.log(`[ELECTRIC-ENGINE] Token present: ${!!config.token}`);
    console.log(`[ELECTRIC-ENGINE] PG instance: ${pg ? 'yes' : 'no'}`);

    if (this.state.isSyncing && this.state.businessId === businessId) {
      console.log(`[ELECTRIC-ENGINE] Already syncing for this business, returning existing cleanup`);
      return () => this.stopSync();
    }

    this.setState({
      isSyncing: true,
      businessId,
      currentSyncResults: [],
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      console.log(`[ELECTRIC-ENGINE] Sync attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      try {
        const shapes = getShapesByPriority();
        console.log(`[ELECTRIC-ENGINE] Got ${shapes.length} shapes to sync`);
        const result = await this.syncWithRetry(pg, config.businessId, config.token, shapes, attempt);

        this.setState({
          currentSyncResults: [...result.success, ...result.failed],
        });

        console.log(`[ELECTRIC-ENGINE] Sync result: ${result.success.length} success, ${result.failed.length} failed`);
        console.log(`[ELECTRIC-ENGINE] Success tables:`, result.success.map(r => r.table).join(', '));
        console.log(`[ELECTRIC-ENGINE] Failed tables:`, result.failed.map(r => `${r.table} (${r.error || 'unknown'})`).join(', '));

        for (const tableResult of result.success) {
          onTableSync?.(tableResult.table, true);
        }
        for (const tableResult of result.failed) {
          onTableSync?.(tableResult.table, false, tableResult.error);
        }

        onSyncComplete?.({
          success: result.success.map((r) => r.table),
          failed: result.failed.map((r) => r.table),
        });

        lastError = null;
        console.log(`[ELECTRIC-ENGINE] Sync completed successfully`);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[ELECTRIC-ENGINE] Sync attempt ${attempt} failed:`, lastError.message);

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          console.log(`[ELECTRIC-ENGINE] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.setState({ isSyncing: false });

    if (lastError) {
      console.error(`[ELECTRIC-ENGINE] All retry attempts exhausted, throwing error:`, lastError.message);
      throw lastError;
    }

    console.log(`[ELECTRIC-ENGINE] Returning cleanup function`);
    return () => this.stopSync();
  }

  private async syncWithRetry(
    pg: PGliteWithElectric,
    businessId: string,
    token: string,
    shapes: Parameters<typeof syncTables>[3],
    attempt: number
  ): Promise<{ success: SyncTableResult[]; failed: SyncTableResult[] }> {
    console.log(`[ELECTRIC-ENGINE] syncWithRetry called (attempt ${attempt})`);
    console.log(`[ELECTRIC-ENGINE] Calling syncTables with ${shapes.length} shapes`);
    const result = await syncTables(pg, businessId, token, shapes);
    console.log(`[ELECTRIC-ENGINE] syncTables returned: ${result.success.length} success, ${result.failed.length} failed`);
    return result;
  }

  stopSync(): void {
    console.log(`[ELECTRIC-ENGINE] stopSync called`);
    const { currentSyncResults } = this.getState();
    stopAllSyncs(currentSyncResults);
    this.setState({
      currentSyncResults: [],
      isSyncing: false,
      businessId: null,
    });
    console.log(`[ELECTRIC-ENGINE] stopSync complete`);
  }

  getSyncState(): ElectricSyncState {
    const { isSyncing, currentSyncResults } = this.getState();
    const tables = new Map<
      string,
      {
        isReady: boolean;
        error?: string;
      }
    >();

    for (const result of currentSyncResults) {
      tables.set(result.table, {
        isReady: result.success,
        error: result.error,
      });
    }

    return {
      isSyncing,
      tables,
    };
  }

  isActive(): boolean {
    return this.getState().isSyncing;
  }

  getSyncedTables(): string[] {
    return this.getState().currentSyncResults
      .filter((r) => r.success)
      .map((r) => r.table);
  }

  getFailedTables(): Array<{ table: string; error?: string }> {
    return this.getState().currentSyncResults
      .filter((r) => !r.success)
      .map((r) => ({
        table: r.table,
        error: r.error,
      }));
  }
}

const syncManager = new ElectricSyncManager();

export async function startSync(config: ElectricSyncConfig): Promise<() => void> {
  return syncManager.startSync(config);
}

export function stopSync(): void {
  syncManager.stopSync();
}

export function getSyncState(): ElectricSyncState {
  return syncManager.getSyncState();
}

export function isSyncActive(): boolean {
  return syncManager.isActive();
}

export function getSyncedTables(): string[] {
  return syncManager.getSyncedTables();
}

export function getFailedTables(): Array<{ table: string; error?: string }> {
  return syncManager.getFailedTables();
}
