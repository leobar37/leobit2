/**
 * Sync Router Factory
 *
 * Creates route definitions for sync endpoints.
 * Framework-agnostic: returns route handlers that can be mounted by any HTTP framework.
 */

import type { SyncService } from "./sync-service";
import type { SyncOperationInput, SyncBatchEntry } from "./types";

export interface SyncRouteConfig {
  syncService: SyncService;
  maxBatchSize?: number;
  maxChangesLimit?: number;
  normalizeEntityType?: (entityType: string) => string;
}

export interface SyncRouteHandlers<TContext = unknown> {
  postBatch: (ctx: TContext, body: { entries: SyncBatchEntry[] }) => Promise<unknown>;
  getChanges: (ctx: TContext, query: {
    since?: string;
    limit?: string;
    cursor?: string;
    entityTypes?: string;
  }) => Promise<unknown>;
  getHealth: (ctx: TContext) => Promise<unknown>;
  getMetrics: (ctx: TContext, query: { hours?: string }) => Promise<unknown>;
  getConflicts: (ctx: TContext, query: {
    status?: string;
    entityType?: string;
    limit?: string;
    offset?: string;
  }) => Promise<unknown>;
  resolveConflict: (ctx: TContext, params: { id: string }, body: {
    resolution: string;
    mergedData?: Record<string, unknown>;
  }) => Promise<unknown>;
  getDeadLetter: (ctx: TContext, query: {
    limit?: string;
    offset?: string;
    entity?: string;
  }) => Promise<unknown>;
  deleteDeadLetter: (ctx: TContext, params: { id: string }) => Promise<unknown>;
}

export function createSyncRouteHandlers<
  TContext extends { tenantId: string; userId?: string; [key: string]: unknown }
>(
  config: SyncRouteConfig
): SyncRouteHandlers<TContext> {
  const MAX_BATCH_SIZE = config.maxBatchSize ?? 100;
  const MAX_CHANGES_LIMIT = config.maxChangesLimit ?? 500;

  return {
    async postBatch(ctx, body) {
      const entries = body.entries || [];

      if (entries.length > MAX_BATCH_SIZE) {
        throw new Error(`Batch too large: max ${MAX_BATCH_SIZE} entries`);
      }

      // Normalize entity types
      if (config.normalizeEntityType) {
        for (const entry of entries) {
          if (entry.kind === "single") {
            entry.operation.entityType = config.normalizeEntityType(entry.operation.entityType);
          } else {
            for (const op of entry.operations) {
              op.entityType = config.normalizeEntityType(op.entityType);
            }
          }
        }
      }

      const result = await config.syncService.processEntries(ctx as any, entries);
      return { success: true, data: result };
    },

    async getChanges(ctx, query) {
      let since: Date | undefined;
      if (query.since) {
        since = new Date(query.since);
        if (isNaN(since.getTime())) {
          throw new Error("Invalid since parameter");
        }
      }

      let limit = 100;
      if (query.limit) {
        const parsed = parseInt(query.limit, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, MAX_CHANGES_LIMIT);
        }
      }

      let entityTypes: string[] | undefined;
      if (query.entityTypes) {
        entityTypes = query.entityTypes.split(",").map((s) => s.trim());
      }

      const result = await config.syncService.getChanges(ctx as any, {
        since,
        limit,
        entityTypes,
        cursorOperationId: query.cursor,
      });

      return { success: true, data: result };
    },

    async getHealth(ctx) {
      const health = await config.syncService.getHealth(ctx as any);
      return { success: true, data: health };
    },

    async getMetrics(ctx, query) {
      let hours = 24;
      if (query.hours) {
        const parsed = parseInt(query.hours, 10);
        if (!isNaN(parsed) && parsed > 0) {
          hours = parsed;
        }
      }

      const metrics = await config.syncService.getMetrics(ctx as any, hours);
      return { success: true, data: metrics };
    },

    async getConflicts(ctx, query) {
      let limit = 50;
      if (query.limit) {
        const parsed = parseInt(query.limit, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, 100);
        }
      }

      let offset = 0;
      if (query.offset) {
        const parsed = parseInt(query.offset, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          offset = parsed;
        }
      }

      const result = await config.syncService.getConflicts(ctx as any, {
        status: query.status,
        entityType: query.entityType,
        limit,
        offset,
      });

      return { success: true, data: result };
    },

    async resolveConflict(ctx, params, body) {
      const { resolution, mergedData } = body;

      const validResolutions = ["server", "local", "merge"];
      if (!validResolutions.includes(resolution)) {
        throw new Error(`Invalid resolution: ${resolution}`);
      }

      const result = await config.syncService.resolveConflict(ctx as any, params.id, {
        resolution: resolution as "server" | "local" | "merge",
        mergedData,
      });

      return { success: true, data: result };
    },

    async getDeadLetter(ctx, query) {
      let limit = 50;
      if (query.limit) {
        const parsed = parseInt(query.limit, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, 100);
        }
      }

      let offset = 0;
      if (query.offset) {
        const parsed = parseInt(query.offset, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          offset = parsed;
        }
      }

      const result = await config.syncService.getDeadLetterItems(ctx as any, {
        limit,
        offset,
        entity: query.entity,
      });

      return { success: true, data: result };
    },

    async deleteDeadLetter(ctx, params) {
      const success = await config.syncService.deleteDeadLetterItem(ctx as any, params.id);
      return { success, data: { deleted: success } };
    },
  };
}
