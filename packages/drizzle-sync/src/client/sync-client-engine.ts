/**
 * SyncClientEngine
 *
 * Unified client-side sync runtime that composes PGlite sync infrastructure
 * into a single, framework-agnostic entry point. Manages the lifecycle of
 * PgSyncQueue, SyncService, PullService, SyncCoordinator, and optionally
 * StagedPullCoordinator.
 *
 * ## Usage
 *
 * ```typescript
 * const engine = createSyncClientEngine({
 *   pg: myPglite,
 *   db: drizzle(myPglite),
 *   tenantId: 'biz-123',
 *   userId: 'user-456',
 *   authToken: 'token',
 *   apiUrl: 'https://api.example.com',
 *   httpClient: myHttpClient,
 *   entities: [...],
 * });
 * await engine.initialize();
 * await engine.start();
 * ```
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type {
  SyncOperationRecord,
  HandlerResult,
  ISyncHttpClient,
  ISyncQueue,
} from "../core";
import { PgSyncQueue } from "../pglite/queue-queue";
import { PushSyncService } from "../pglite/push-service";
import type { PushServiceOptions } from "../pglite/push-types";
import { PullSyncService } from "../pglite/pull-service";
import type { PullServiceOptions, PullHttpClient } from "../pglite/pull-types";
import { SyncCoordinator, type SyncCoordinatorOptions } from "../pglite/coordination-coordinator";
import { StagedPullCoordinator, type StageConfig, type IPullService as IStagedPullService } from "../pglite/coordination-staged-pull-coordinator";
import { SyncMutex, type ISyncMutex } from "../pglite/sync-mutex";
import { SyncEventEmitter } from "../core/sync-events";
import type { ISyncEventEmitter } from "../core/sync-events";
import type {
  SyncClientEngineConfig,
  SyncClientEngineContext,
  SyncClientEngineStatus,
} from "./types";
import { initPgliteDatabase, disposeDatabase, resetDatabase } from "./database-init";

type EngineState = "uninitialized" | "initialized" | "running" | "stopped";

export class SyncClientEngine {
  private readonly config: SyncClientEngineConfig;
  private readonly eventEmitter: ISyncEventEmitter;
  private readonly mutex: ISyncMutex;
  private readonly services: Map<string, unknown> = new Map();

  private state: EngineState = "uninitialized";
  private pg: PGlite | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private syncQueue: ISyncQueue | null = null;
  private syncService: PushSyncService | null = null;
  private pullService: PullSyncService | null = null;
  private coordinator: SyncCoordinator | null = null;
  private stagedPullCoordinator: StagedPullCoordinator<string> | null = null;

  private unsubscribers: Array<() => void> = [];

  constructor(config: SyncClientEngineConfig) {
    this.config = config;
    this.eventEmitter = config.eventEmitter ?? new SyncEventEmitter();
    this.mutex = config.mutex ?? new SyncMutex();
  }

  getPg(): PGlite {
    if (!this.pg) {
      throw new Error("PGlite not initialized. Call initialize() first.");
    }
    return this.pg;
  }

  getDb(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error("Drizzle not initialized. Call initialize() first.");
    }
    return this.db;
  }

  async initialize(): Promise<void> {
    if (this.state !== "uninitialized") {
      return;
    }

    // Auto-initialize database if databaseConfig is provided
    if (this.config.databaseConfig) {
      const result = await initPgliteDatabase(this.config.databaseConfig);
      this.pg = result.pg;
      this.db = result.db;
    } else if (this.config.pg && this.config.db) {
      this.pg = this.config.pg;
      this.db = this.config.db;
    } else {
      throw new Error(
        "SyncClientEngine requires either 'databaseConfig' or both 'pg' and 'db'. " +
        "Provide databaseConfig for auto-init, or pg/db for manual mode."
      );
    }

    const { tenantId, userId, tenantColumn, authToken, apiUrl, httpClient, sync, cursorStorage } = this.config;

    // Create context for dependency injection
    const context: SyncClientEngineContext = {
      pg: this.pg,
      db: this.db,
      tenantId,
      tenantColumn: tenantColumn ?? "tenant_id",
      userId,
      syncService: null as any, // Will be set after creation
    };

    this.syncQueue = this.config.queue ?? new PgSyncQueue(context, { logger: this.config.logger });

    const adaptedHttpClient: ISyncHttpClient = {
      sendBatch: async (operations: SyncOperationRecord[]): Promise<HandlerResult[]> => {
        const result = await httpClient.postBatch(operations);
        if (!result.success) return [];
        return (result.results as Array<{ idempotencyKey: string; success: boolean; error?: string; conflict?: { serverVersion: number; serverData: Record<string, unknown> } }>).map((r) => ({
          success: r.success,
          idempotencyKey: r.idempotencyKey,
          error: r.error,
          conflict: r.conflict ? {
            entityType: "",
            entityId: "",
            clientVersion: 0,
            serverVersion: r.conflict.serverVersion,
            serverData: r.conflict.serverData,
          } : undefined,
          serverTimestamp: new Date().toISOString(),
        }));
      },
      fetchChanges: async (cursor?: string, limit?: number) => {
        const result = await httpClient.getChanges({
          tenantId,
          since: cursor,
          limit,
        });
        return {
          changes: result.changes,
          cursor: result.nextSince,
          hasMore: result.hasMore,
        };
      },
    };

    const syncServiceOptions: PushServiceOptions = {
      queue: this.syncQueue,
      httpClient: adaptedHttpClient,
      mutex: this.mutex,
      logger: this.config.logger,
    };
    this.syncService = new PushSyncService(context, syncServiceOptions);
    context.syncService = this.syncService;

    const pullHttpClient: PullHttpClient = {
      getChanges: (params) => httpClient.getChanges(params),
      abort: () => httpClient.abort(),
    };

    const pullServiceOptions: PullServiceOptions = {
      httpClient: pullHttpClient,
      applierConfig: this.config.applierConfig,
      cursorStorage: cursorStorage ?? undefined,
      mutex: this.mutex,
      logger: this.config.logger,
      isOnline: this.config.isOnline,
    };
    this.pullService = new PullSyncService(context, pullServiceOptions);

    const coordinatorOptions: SyncCoordinatorOptions = {
      pushIntervalMs: sync?.pushIntervalMs,
      pullIntervalMs: sync?.pullIntervalMs,
      enableAutoSync: sync?.enableAutoSync,
      events: this.eventEmitter,
      logger: this.config.logger,
    };
    this.coordinator = new SyncCoordinator(this.syncService, this.pullService, coordinatorOptions);

    if (this.config.stages) {
      const stagesConfig = this.buildStagesConfig();
      const stagedPullService = this.createStagedPullServiceAdapter();

      this.stagedPullCoordinator = new StagedPullCoordinator<string>({
        pullService: stagedPullService,
        stages: stagesConfig,
        getEntitiesForStage: (stage: string) => this.getEntitiesForStage(stage),
        isOnline: this.config.isOnline,
      });
    }

    await this.syncService.initialize();
    await this.pullService.initialize();

    this.instantiateServices();

    // Execute app-specific initialization hooks after services are ready
    if (this.config.callbacks?.onServicesReady) {
      await this.config.callbacks.onServicesReady(this.services);
    }

    this.wireCallbacks();

    this.state = "initialized";
  }

  async start(): Promise<void> {
    if (this.state === "uninitialized") {
      throw new Error("SyncClientEngine not initialized. Call initialize() first.");
    }
    if (this.state === "running") {
      return;
    }

    await this.coordinator!.start();

    if (this.stagedPullCoordinator) {
      this.stagedPullCoordinator.executeStagedLoad().catch((err: unknown) => {
        console.error("[SyncClientEngine] Staged pull failed:", err);
      });
    }

    this.state = "running";
  }

  async stop(): Promise<void> {
    if (this.state !== "running") {
      return;
    }

    this.coordinator!.stop();

    if (this.stagedPullCoordinator) {
      this.stagedPullCoordinator.abort();
    }

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.state = "stopped";
  }

  async triggerSync(): Promise<void> {
    this.ensureInitialized();
    await this.coordinator!.forceSync();
  }

  async triggerPull(): Promise<{ success: boolean; changesApplied: number; hasMore: boolean }> {
    this.ensureInitialized();
    return this.pullService!.pull();
  }

  getStatus(): SyncClientEngineStatus {
    const online = this.config.isOnline ? this.config.isOnline() : (typeof navigator !== "undefined" ? navigator.onLine : true);

    return {
      isInitialized: this.state !== "uninitialized",
      isRunning: this.state === "running",
      pending: 0,
      failed: 0,
      conflict: 0,
      deadLetter: 0,
      isStuck: false,
      lastSyncTime: null,
      isOnline: online,
      push: undefined,
      pull: undefined,
    };
  }

  async getDetailedStatus(): Promise<SyncClientEngineStatus> {
    const base = this.getStatus();

    if (this.syncService && this.state !== "uninitialized") {
      try {
        const queueStatus = await this.syncService.getStatus();
        base.pending = queueStatus.pending;
        base.failed = queueStatus.failed;
        base.conflict = queueStatus.conflict;
        base.deadLetter = queueStatus.deadLetter;
        base.push = queueStatus;
      } catch {
        // Queue may not be ready yet
      }
    }

    if (this.pullService && this.state !== "uninitialized") {
      try {
        const pullStatus = this.pullService.getStatus();
        base.isStuck = pullStatus.isStuck;
        base.lastSyncTime = pullStatus.lastPullTime;
        base.pull = pullStatus;
      } catch {
        // Pull service may not be ready yet
      }
    }

    return base;
  }

  getEventEmitter(): ISyncEventEmitter {
    return this.eventEmitter;
  }

  getService<T = unknown>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found. Available services: ${this.getAllServiceNames().join(", ")}`);
    }
    return this.services.get(name) as T;
  }

  hasService(name: string): boolean {
    return this.services.has(name);
  }

  getAllServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  getSyncService(): PushSyncService | null {
    return this.syncService;
  }

  getSyncOperations(): PushSyncService | null {
    return this.syncService;
  }

  getPullService(): PullSyncService | null {
    return this.pullService;
  }

  getCoordinator(): SyncCoordinator | null {
    return this.coordinator;
  }

  async dispose(): Promise<void> {
    await this.stop();
    if (this.pg) {
      try {
        await this.pg.close();
      } catch (error) {
        console.warn("[SyncClientEngine] Failed to close PGlite:", error);
      }
    }
    this.pg = null;
    this.db = null;
    this.state = "uninitialized";
  }

  async resetAndLogout(options?: {
    redirectUrl?: string;
    preserveSession?: boolean;
    reloadPage?: boolean;
    clearStorageKeys?: string[];
  }): Promise<void> {
    const {
      redirectUrl = "/login",
      preserveSession = false,
      reloadPage = false,
      clearStorageKeys = [],
    } = options ?? {};

    await this.dispose();

    // Clear IndexedDB databases
    const dataDir = this.config.databaseConfig?.dataDir;
    if (dataDir) {
      await resetDatabase({
        versionKey: this.config.databaseConfig?.versionKey,
        storage: this.config.databaseConfig?.storage,
      });
    }

    // Clear specified localStorage keys
    const keysToClear = [
      ...clearStorageKeys,
      ...(preserveSession ? [] : ["bearer_token", "current_business_id", "business_user_id"]),
    ];
    for (const key of keysToClear) {
      localStorage.removeItem(key);
    }

    if (reloadPage) {
      window.location.reload();
    } else {
      window.location.href = redirectUrl;
    }
  }

  private ensureInitialized(): void {
    if (this.state === "uninitialized") {
      throw new Error("SyncClientEngine not initialized. Call initialize() first.");
    }
  }

  private instantiateServices(): void {
    const { tenantId, userId, tenantColumn } = this.config;

    const context: SyncClientEngineContext = {
      pg: this.getPg(),
      db: this.getDb(),
      tenantId,
      tenantColumn: tenantColumn ?? "tenant_id",
      userId,
      syncService: this.syncService!,
    };

    for (const definition of this.config.entities) {
      const instance = definition.factory(context);
      this.services.set(definition.name, instance);
    }
  }

  private wireCallbacks(): void {
    const { callbacks } = this.config;
    if (!callbacks) return;

    if (callbacks.onPullComplete) {
      const unsub = this.eventEmitter.on("pull:complete", (event) => {
        callbacks.onPullComplete!({
          changesApplied: event.changesApplied,
          entityTypes: event.entityTypes,
        });
      });
      this.unsubscribers.push(unsub);
    }

    if (callbacks.onPushComplete) {
      const unsub = this.eventEmitter.on("push:complete", (event) => {
        callbacks.onPushComplete!({
          processed: event.operationsProcessed,
          failed: event.failed,
          conflicts: event.conflicts,
        });
      });
      this.unsubscribers.push(unsub);
    }

    if (callbacks.onError) {
      const unsubPullError = this.eventEmitter.on("pull:error", (event) => {
        callbacks.onError!(event.error, "pull");
      });
      const unsubPushError = this.eventEmitter.on("push:error", (event) => {
        callbacks.onError!(event.error, event.entityType ?? "push");
      });
      this.unsubscribers.push(unsubPullError, unsubPushError);
    }
  }

  private createStagedPullServiceAdapter(): IStagedPullService {
    const pullService = this.pullService!;
    return {
      async pullWithOptions(options: { entityTypes?: string[]; since?: string; limit?: number; cursorKey?: string }) {
        const result = await pullService.pull();
        return {
          ...result,
          nextSince: null,
        };
      },
      getStageCursor(stageKey: string): string | null {
        return null;
      },
      abort(): void {
        pullService.stopAutoPull();
      },
    };
  }

  private buildStagesConfig(): Record<string, StageConfig<string>> {
    if (!this.config.stages) return {};

    const result: Record<string, StageConfig<string>> = {};
    for (const stage of this.config.stages.stages) {
      result[stage.name] = {
        name: stage.name,
        entities: stage.entities,
        lookbackDays: stage.lookbackDays,
        behavior: stage.behavior,
      };
    }
    return result;
  }

  private getEntitiesForStage(stage: string): string[] {
    if (!this.config.stages) return [];
    const stageConfig = this.config.stages.stages.find((s) => s.name === stage);
    return stageConfig ? [...stageConfig.entities] : [];
  }
}
