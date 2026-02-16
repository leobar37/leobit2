import { api } from "~/lib/api-client";
import { createSyncId, isOnline } from "~/lib/sync/utils";
import {
  enqueue,
  getPendingCount,
  listPending,
  markFailed,
  markProcessed,
} from "~/lib/sync/queue";
import { SyncStorage } from "~/lib/sync/storage";
import type { SyncOperation } from "~/lib/db/schema";

export type EngineStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncEngineState {
  status: EngineStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  isConnected: boolean;
  lastError: string | null;
}

type BatchResultItem = {
  operationId: string;
  success: boolean;
  error?: string;
};

type SyncListener = (state: SyncEngineState) => void;

class SyncClient {
  private state: SyncEngineState = {
    status: "idle",
    pendingCount: 0,
    lastSyncAt: SyncStorage.getLastSyncAt(),
    isSyncing: false,
    isConnected: isOnline(),
    lastError: null,
  };

  private listeners = new Set<SyncListener>();
  private syncLock = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subscribers = 0;
  private started = false;

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SyncEngineState {
    return this.state;
  }

  async enqueueOperation(input: Omit<SyncOperation, "id" | "timestamp" | "attempts">) {
    const operation: SyncOperation = {
      ...input,
      id: createSyncId(),
      timestamp: Date.now(),
      attempts: 0,
    };

    await enqueue(operation);
    await this.refreshPendingCount();
    this.setState({ status: "idle" });

    return operation.id;
  }

  start() {
    this.subscribers += 1;

    if (this.started || typeof window === "undefined") {
      return;
    }

    this.started = true;
    this.setState({ isConnected: isOnline(), status: isOnline() ? "idle" : "offline" });

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    this.intervalId = setInterval(() => {
      void this.runSyncCycle();
    }, 30000);

    void this.runSyncCycle();
  }

  stop() {
    this.subscribers = Math.max(0, this.subscribers - 1);

    if (this.subscribers > 0 || !this.started || typeof window === "undefined") {
      return;
    }

    this.started = false;

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async forceSync() {
    await this.runSyncCycle();
  }

  private setState(partial: Partial<SyncEngineState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private async refreshPendingCount() {
    const pendingCount = await getPendingCount();
    this.setState({ pendingCount });
  }

  private async runSyncCycle() {
    if (!isOnline()) {
      await this.refreshPendingCount();
      this.setState({
        isConnected: false,
        status: "offline",
        isSyncing: false,
      });
      return;
    }

    if (this.syncLock) {
      return;
    }

    this.syncLock = true;
    this.setState({
      status: "syncing",
      isSyncing: true,
      isConnected: true,
      lastError: null,
    });

    try {
      await this.pushBatch();
      await this.pullChanges();
      await this.refreshPendingCount();

      this.setState({
        status: this.state.pendingCount > 0 ? "idle" : "idle",
        isSyncing: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      this.setState({
        status: "error",
        isSyncing: false,
        lastError: message,
      });
    } finally {
      this.syncLock = false;
    }
  }

  private async pushBatch() {
    const operations = await listPending(50);
    if (operations.length === 0) {
      return;
    }

    const payload = operations.map((operation) => ({
      operationId: operation.id,
      entity: operation.entity,
      action: operation.operation,
      entityId: operation.entityId,
      payload: operation.data,
      clientTimestamp: new Date(operation.timestamp).toISOString(),
    }));

    const response = await api.sync.batch.post({ operations: payload });
    if (response.error) {
      throw new Error(String(response.error.value));
    }

    const body = response.data as
      | { success?: boolean; data?: { results?: BatchResultItem[] } }
      | undefined;

    const results = body?.data?.results ?? [];
    const byOperation = new Map(results.map((item) => [item.operationId, item]));

    for (const operation of operations) {
      const result = byOperation.get(operation.id);

      if (!result || result.success) {
        await markProcessed(operation.id);
        continue;
      }

      await markFailed(operation.id, result.error ?? "Sync item failed", true);
    }
  }

  private async pullChanges() {
    const since = SyncStorage.getCursor();
    const response = await api.sync.changes.get({
      query: {
        since: since || undefined,
        limit: "100",
      },
    });

    if (response.error) {
      throw new Error(String(response.error.value));
    }

    const body = response.data as
      | {
          success?: boolean;
          data?: { nextSince?: string };
        }
      | undefined;

    const nextSince = body?.data?.nextSince;
    if (nextSince) {
      SyncStorage.setCursor(nextSince);
    }

    const now = new Date();
    SyncStorage.setLastSyncAt(now);
    this.setState({ lastSyncAt: now });
  }

  private handleOnline = () => {
    this.setState({ isConnected: true, status: "idle" });
    void this.runSyncCycle();
  };

  private handleOffline = () => {
    this.setState({ isConnected: false, status: "offline", isSyncing: false });
  };
}

export const syncClient = new SyncClient();
