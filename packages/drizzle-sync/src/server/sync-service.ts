/**
 * SyncService
 *
 * Orchestrator service that wraps SyncEngine and provides
 * hooks for business-specific customization.
 */

import type { ISyncEventEmitter } from "../core";
import type {
  ConflictResolutionData,
  ISyncConflictRepository,
  SyncConflict,
} from "./conflict-repository";
import type { GenericConflictResolverRegistry } from "./conflict-resolver";
import type { DeadLetterRecord, ISyncDeadLetterRepository } from "./dead-letter-repository";
import type {
  ISyncOperationRepository
} from "./operation-repository";
import type { SyncEngine, SyncRequestContext } from "./sync-engine";
import type {
  SyncBatchEntry,
  SyncBatchResult,
  SyncHandlerResult,
  SyncOperationInput,
} from "./types";

// ============================================================================
// Hooks
// ============================================================================

export interface SyncChange {
  idempotencyKey: string;
  entityType: string;
  operation: string;
  entityId: string;
  payload: Record<string, unknown>;
  localTimestamp: string;
  processedAt: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

export interface SyncServiceHooks<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = unknown
> {
  /** Called after a conflict is detected by the resolver */
  onConflictDetected?: (
    entityType: string,
    result: ConflictCheckResult,
    record: unknown,
    ctx: TRequestContext
  ) => Promise<ConflictCheckResult>;

  /** Called to enrich changes before returning to client */
  enrichChanges?: (
    changes: SyncChange[],
    ctx: TRequestContext
  ) => Promise<SyncChange[]>;

  /** Called before each operation is processed */
  beforeOperation?: (
    operation: SyncOperationInput,
    ctx: TRequestContext
  ) => Promise<void>;

  /** Called after each operation is processed */
  afterOperation?: (
    operation: SyncOperationInput,
    result: SyncHandlerResult,
    ctx: TRequestContext
  ) => Promise<void>;

  /** Called after a batch is completed */
  onBatchComplete?: (
    result: SyncBatchResult,
    ctx: TRequestContext
  ) => Promise<void>;
}

// ============================================================================
// Config
// ============================================================================

export interface SyncServiceConfig<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = unknown
> {
  /** SyncEngine instance */
  engine: SyncEngine<TRequestContext, TTransaction>;
  /** Operation repository */
  syncOpRepo: ISyncOperationRepository<TRequestContext, TTransaction>;
  /** Conflict repository */
  syncConflictRepo: ISyncConflictRepository<TRequestContext, TTransaction>;
  /** Dead letter repository */
  syncDeadLetterRepo: ISyncDeadLetterRepository<TRequestContext, TTransaction>;
  /** Conflict resolver registry */
  conflictResolverRegistry: GenericConflictResolverRegistry<string, TRequestContext, TTransaction>;
  /** Optional hooks for customization */
  hooks?: SyncServiceHooks<TRequestContext, TTransaction>;
  /** Optional custom getChanges implementation */
  getChanges?: (
    ctx: TRequestContext,
    options?: {
      since?: Date;
      limit?: number;
      entityTypes?: string[];
      cursorOperationId?: string;
    }
  ) => Promise<{
    changes: SyncChange[];
    nextSince: string;
    serverTimestamp: string;
    hasMore: boolean;
  }>;
  /** Optional metrics collector */
  metricsCollector?: {
    getMetrics(ctx: TRequestContext, hours?: number): Promise<unknown>;
  };
  /** Optional event emitter */
  eventEmitter?: ISyncEventEmitter;
  /** Function to get current ISO timestamp */
  now: () => string;
}

// ============================================================================
// SyncService
// ============================================================================

export class SyncService<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = unknown
> {
  private config: SyncServiceConfig<TRequestContext, TTransaction>;

  constructor(config: SyncServiceConfig<TRequestContext, TTransaction>) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Batch Processing
  // --------------------------------------------------------------------------

  async processBatch(
    ctx: TRequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const entries: SyncBatchEntry[] = operations.map((op) => ({
      kind: "single",
      operation: op,
    }));
    return this.processEntries(ctx, entries);
  }

  async processEntries(
    ctx: TRequestContext,
    entries: SyncBatchEntry[]
  ): Promise<SyncBatchResult> {
    const result = await this.config.engine.processEntries(ctx, entries);

    if (this.config.hooks?.onBatchComplete) {
      await this.config.hooks.onBatchComplete(result, ctx);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Changes (Pull)
  // --------------------------------------------------------------------------

  async getChanges(
    ctx: TRequestContext,
    options?: {
      since?: Date;
      limit?: number;
      entityTypes?: string[];
      cursorOperationId?: string;
    }
  ): Promise<{
    changes: SyncChange[];
    nextSince: string;
    serverTimestamp: string;
    hasMore: boolean;
  }> {
    // Use custom getChanges if provided
    if (this.config.getChanges) {
      return this.config.getChanges(ctx, options);
    }

    const { since, limit = 100, entityTypes, cursorOperationId } = options ?? {};
    const effectiveLimit = Math.min(limit, 500);

    // This is a generic implementation that queries the sync operations table
    // Concrete implementations may need to override or enrich this
    const changes = await this.config.syncOpRepo.findMany(ctx, {
      status: "processed",
      since,
      limit: effectiveLimit + 1,
      entityTypes,
      cursorOperationId,
    });

    const hasMore = changes.length > effectiveLimit;
    const results = hasMore ? changes.slice(0, effectiveLimit) : changes;

    const last = results[results.length - 1];
    const serverTimestamp = this.config.now();

    const nextSince = last?.processedAt
      ? `${last.processedAt.toISOString()}_${last.operationId}`
      : serverTimestamp;

    let mappedChanges: SyncChange[] = results.map((item) => ({
      idempotencyKey: item.operationId,
      entityType: item.entityType ?? (item as any).entity ?? "",
      operation: item.operation ?? (item as any).action ?? "",
      entityId: item.entityId ?? "",
      payload: item.payload ?? {},
      localTimestamp: (item as any).clientTimestamp?.toISOString() ?? serverTimestamp,
      processedAt: item.processedAt?.toISOString() ?? serverTimestamp,
    }));

    // Apply enrichChanges hook
    if (this.config.hooks?.enrichChanges) {
      mappedChanges = await this.config.hooks.enrichChanges(mappedChanges, ctx);
    }

    return {
      changes: mappedChanges,
      nextSince,
      serverTimestamp,
      hasMore,
    };
  }

  // --------------------------------------------------------------------------
  // Conflicts
  // --------------------------------------------------------------------------

  async getConflicts(
    ctx: TRequestContext,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    conflicts: SyncConflict[];
    total: number;
    pending: number;
  }> {
    const [conflicts, total] = await Promise.all([
      this.config.syncConflictRepo.findMany(ctx, options),
      this.config.syncConflictRepo.countPending(ctx),
    ]);

    return {
      conflicts,
      total: conflicts.length,
      pending: total,
    };
  }

  async resolveConflict(
    ctx: TRequestContext,
    id: string,
    resolution: ConflictResolutionData
  ): Promise<SyncConflict | undefined> {
    const conflict = await this.config.syncConflictRepo.findById(ctx, id);
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    if (conflict.status !== "pending") {
      throw new Error("Conflict already resolved");
    }

    const validResolutions = ["server", "local", "merge"];
    if (!validResolutions.includes(resolution.resolution)) {
      throw new Error(`Invalid resolution: ${resolution.resolution}`);
    }

    return this.config.syncConflictRepo.resolve(ctx, id, resolution);
  }

  // --------------------------------------------------------------------------
  // Dead Letter Queue
  // --------------------------------------------------------------------------

  async getDeadLetterItems(
    ctx: TRequestContext,
    options: { limit: number; offset: number; entity?: string }
  ): Promise<{
    items: DeadLetterRecord[];
    total: number;
  }> {
    const [items, total] = await Promise.all([
      this.config.syncDeadLetterRepo.findMany(ctx, options),
      this.config.syncDeadLetterRepo.count(ctx),
    ]);

    return { items, total };
  }

  async deleteDeadLetterItem(ctx: TRequestContext, id: string): Promise<boolean> {
    return this.config.syncDeadLetterRepo.delete(ctx, id);
  }

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  async getMetrics(ctx: TRequestContext, hours?: number): Promise<unknown> {
    if (this.config.metricsCollector) {
      return this.config.metricsCollector.getMetrics(ctx, hours);
    }

    // Default metrics: count operations by status
    const metrics = {
      timestamp: this.config.now(),
      hours: hours ?? 24,
      // Concrete implementations should provide real metrics
      placeholder: true,
    };

    return metrics;
  }

  // --------------------------------------------------------------------------
  // Health
  // --------------------------------------------------------------------------

  async getHealth(ctx: TRequestContext): Promise<{
    healthy: boolean;
    pendingOperations: number;
    pendingConflicts: number;
    deadLetterCount: number;
  }> {
    const [pendingOps, pendingConflicts, deadLetterCount] = await Promise.all([
      this.countPendingOperations(ctx),
      this.config.syncConflictRepo.countPending(ctx),
      this.config.syncDeadLetterRepo.count(ctx),
    ]);

    return {
      healthy: true,
      pendingOperations: pendingOps,
      pendingConflicts,
      deadLetterCount,
    };
  }

  private async countPendingOperations(ctx: TRequestContext): Promise<number> {
    // Generic count - concrete repo implementations should provide this
    return 0;
  }
}
