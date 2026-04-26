import { Elysia, t } from "elysia";
import { SYNC_ENTITIES } from "@avileo/shared";
import type { SyncEntity } from "@avileo/shared";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { createLogger } from "../lib/logger";
import { SyncConflictRepository } from "../services/sync/framework/SyncConflictRepository";
import { SyncDeadLetterRepository } from "../services/sync/framework/SyncDeadLetterRepository";
import { SyncMetricsService } from "../services/sync/framework/SyncMetricsService";
import type { SyncOperationInput } from "../services/sync/types";
import type { SyncBatchEntry } from "../services/sync/sync.service";
import { parseCursor } from "./sync-cursor";

const logger = createLogger("SyncRoute");

// Maximum operations per batch request
const MAX_BATCH_SIZE = 100;

// Maximum limit for /sync/changes
const MAX_CHANGES_LIMIT = 500;
const DEFAULT_CHANGES_LIMIT = 100;

const LEGACY_ENTITY_TYPE_ALIASES = {
  saleItems: "sale_items",
  purchaseItems: "purchase_items",
  productVariants: "product_variants",
  customerTags: "customer_tags",
  customerGroups: "customer_groups",
  customerGroupMembers: "customer_group_members",
  distribucionItems: "distribucion_items",
} as const satisfies Record<string, SyncEntity>;

type LegacyEntityType = keyof typeof LEGACY_ENTITY_TYPE_ALIASES;

function normalizeEntityType(entityType: SyncEntity | LegacyEntityType): SyncEntity {
  return LEGACY_ENTITY_TYPE_ALIASES[entityType as LegacyEntityType] ?? entityType;
}

function normalizeEntityTypeFilter(entityType: string): string {
  return LEGACY_ENTITY_TYPE_ALIASES[entityType as LegacyEntityType] ?? entityType;
}

const entityLiterals = [
  ...SYNC_ENTITIES,
  ...(Object.keys(LEGACY_ENTITY_TYPE_ALIASES) as LegacyEntityType[]),
].map((entity) => t.Literal(entity)) as [
  ReturnType<typeof t.Literal>,
  ...ReturnType<typeof t.Literal>[],
];

const entityTypeSchema = t.Union(entityLiterals);

export const syncRoutes = new Elysia({ prefix: "/sync" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/batch",
    async ({ syncService, ctx, body, set }) => {
      const entries = body.entries;

      // Normalize entity types inside each operation
      const normalizedEntries: SyncBatchEntry[] = entries.map((entry) => {
        if (entry.kind === "single") {
          return {
            kind: "single" as const,
            operation: {
              ...entry.operation,
              entityType: normalizeEntityType(entry.operation.entityType as any),
            },
          };
        }
        return {
          kind: "batch" as const,
          operations: entry.operations.map((op: any) => ({
            ...op,
            entityType: normalizeEntityType(op.entityType as any),
          })),
        };
      });

      // Count total operations for limit enforcement
      const totalOperations = normalizedEntries.reduce(
        (count, entry) =>
          count + (entry.kind === "batch" ? entry.operations.length : 1),
        0
      );

      if (totalOperations > MAX_BATCH_SIZE) {
        set.status = 400;
        return {
          success: false,
          error: {
            code: "BATCH_TOO_LARGE",
            message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} operations. Received: ${totalOperations}`,
            maxBatchSize: MAX_BATCH_SIZE,
          },
        };
      }

      // Validate each operation
      let opIndex = 0;
      for (const entry of normalizedEntries) {
        const ops = entry.kind === "batch" ? entry.operations : [entry.operation];
        for (const op of ops) {
          if (!op.idempotencyKey || typeof op.idempotencyKey !== "string") {
            set.status = 400;
            return {
              success: false,
              error: {
                code: "INVALID_OPERATION",
                message: `Operation at index ${opIndex} missing valid idempotencyKey`,
                index: opIndex,
              },
            };
          }
          if (!op.entityId || typeof op.entityId !== "string") {
            set.status = 400;
            return {
              success: false,
              error: {
                code: "INVALID_OPERATION",
                message: `Operation at index ${opIndex} missing valid entityId`,
                index: opIndex,
              },
            };
          }
          if (op.localTimestamp) {
            const ts = new Date(op.localTimestamp);
            if (isNaN(ts.getTime())) {
              set.status = 400;
              return {
                success: false,
                error: {
                  code: "INVALID_OPERATION",
                  message: `Operation at index ${opIndex} has invalid localTimestamp`,
                  index: opIndex,
                },
              };
            }
          }
          opIndex++;
        }
      }

      // Log incoming sync batch request
      const allOps = normalizedEntries.flatMap((entry) =>
        entry.kind === "batch" ? entry.operations : [entry.operation]
      );
      const salesOps = allOps.filter((op) => op.entityType === "sales");
      const updateOps = salesOps.filter((op) => op.operation === "update");

      logger.info({
        msg: "📥 SYNC BATCH REQUEST",
        businessId: ctx.businessId,
        userId: ctx.businessUserId,
        entries: entries.length,
        totalOperations: allOps.length,
        operationsByEntity: allOps.reduce((acc: Record<string, number>, op) => {
          acc[op.entityType] = (acc[op.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        salesOperations: salesOps.length,
        saleUpdates: updateOps.length,
        saleUpdateIds: updateOps.map((op) => op.entityId),
      });

      const startTime = Date.now();
      const result = await syncService.processEntries(
        ctx as RequestContext,
        normalizedEntries
      );
      const duration = Date.now() - startTime;

      // Log completion
      const failedOps = result.results.filter((r: { success: boolean }) => !r.success);
      logger.info({
        msg: "📤 SYNC BATCH RESPONSE",
        businessId: ctx.businessId,
        duration,
        total: result.results.length,
        succeeded: result.results.length - failedOps.length,
        failed: failedOps.length,
        errors: failedOps.map((r: { idempotencyKey: string; error?: string }) => ({
          key: r.idempotencyKey,
          error: r.error,
        })),
      });

      return { success: true, data: result };
    },
    {
      body: t.Object({
        entries: t.Array(
          t.Union([
            t.Object({
              kind: t.Literal("single"),
              operation: t.Object({
                idempotencyKey: t.String({ minLength: 1 }),
                entityType: entityTypeSchema,
                entityId: t.String({ minLength: 1 }),
                operation: t.Union([
                  t.Literal("create"),
                  t.Literal("update"),
                  t.Literal("delete"),
                ]),
                payload: t.Record(t.String(), t.Unknown()),
                localVersion: t.Number({ minimum: 0 }),
                localTimestamp: t.String(),
                correlationId: t.Optional(t.String()),
                deviceId: t.Optional(t.String()),
                sourceFingerprint: t.Optional(t.String()),
              }),
            }),
            t.Object({
              kind: t.Literal("batch"),
              operations: t.Array(
                t.Object({
                  idempotencyKey: t.String({ minLength: 1 }),
                  entityType: entityTypeSchema,
                  entityId: t.String({ minLength: 1 }),
                  operation: t.Union([
                    t.Literal("create"),
                    t.Literal("update"),
                    t.Literal("delete"),
                  ]),
                  payload: t.Record(t.String(), t.Unknown()),
                  localVersion: t.Number({ minimum: 0 }),
                  localTimestamp: t.String(),
                  correlationId: t.Optional(t.String()),
                  deviceId: t.Optional(t.String()),
                  sourceFingerprint: t.Optional(t.String()),
                }),
                { minItems: 1, maxItems: MAX_BATCH_SIZE }
              ),
            }),
          ]),
          { minItems: 1 }
        ),
      }),
    }
  )
  .get(
    "/changes",
    async ({ syncService, ctx, query, set }) => {
      // Parse and validate cursor (since parameter)
      // Supports two formats:
      // 1. Legacy: ISO 8601 timestamp (e.g., "2026-03-07T18:07:41.784Z")
      // 2. New: timestamp_operationId (e.g., "2026-03-07T18:07:41.784Z_op-123")
      let since: Date | undefined;
      let cursorOperationId: string | undefined;
      if (query.since) {
        const cursorResult = parseCursor(query.since);

        if (!cursorResult.valid) {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "INVALID_CURSOR",
              message: cursorResult.error || "Invalid cursor format.",
            },
          };
        }

        if (cursorResult.isLegacy) {
          logger.debug({ msg: "Legacy cursor format detected", cursor: query.since.slice(0, 30) });
        }

        since = cursorResult.date;
        cursorOperationId = cursorResult.operationId;

        // Validate cursor is not in the future
        if (since && since > new Date()) {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "FUTURE_CURSOR",
              message: "Cursor timestamp is in the future. Please reset your sync.",
            },
          };
        }
      }

      // Parse and validate limit
      let limit = DEFAULT_CHANGES_LIMIT;
      if (query.limit) {
        const parsedLimit = parseInt(query.limit, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "INVALID_LIMIT",
              message: "Invalid 'limit' parameter. Must be a positive integer.",
            },
          };
        }
        // Cap limit at maximum
        limit = Math.min(parsedLimit, MAX_CHANGES_LIMIT);
      }

      // Parse entityTypes filter for staged loading (comma-separated list)
      let entityTypes: string[] | undefined;
      if (query.entityTypes) {
        entityTypes = query.entityTypes
          .split(",")
          .map((entityType) => entityType.trim())
          .filter(Boolean)
          .map(normalizeEntityTypeFilter);
      }

      const result = await syncService.getChanges(
        ctx as RequestContext,
        since,
        limit,
        entityTypes,
        cursorOperationId
      );

      return { success: true, data: result };
    },
    {
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        entityTypes: t.Optional(t.String()), // Comma-separated entity types
      }),
    }
  )
  .get(
    "/health",
    async ({ ctx }) => {
      const { syncLogger } = await import("../services/sync/sync-logger");

      return {
        success: true,
        data: {
          metrics: syncLogger.getMetrics(),
          errorSummary: syncLogger.getErrorSummary(),
          recentErrors: syncLogger.getRecentErrors(10),
        },
      };
    }
  )
  .get(
    "/conflicts",
    async ({ ctx, query }) => {
      const conflictRepo = new SyncConflictRepository();

      let limit = 50;
      if (query.limit) {
        const parsedLimit = parseInt(query.limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100);
        }
      }

      let offset = 0;
      if (query.offset) {
        const parsedOffset = parseInt(query.offset, 10);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset;
        }
      }

      const conflicts = await conflictRepo.findByBusiness(
        ctx as RequestContext,
        {
          status: query.status || "pending",
          entityType: query.entityType
            ? normalizeEntityTypeFilter(query.entityType)
            : undefined,
          limit,
          offset,
        }
      );

      const pendingCount = await conflictRepo.countPending(ctx as RequestContext);

      return {
        success: true,
        data: {
          conflicts,
          pendingCount,
          pagination: {
            limit,
            offset,
            hasMore: conflicts.length === limit,
          },
        },
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        entityType: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/conflicts/:id",
    async ({ ctx, params }) => {
      const conflictRepo = new SyncConflictRepository();

      const conflict = await conflictRepo.findById(
        ctx as RequestContext,
        params.id
      );

      if (!conflict) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Conflict not found",
          },
        };
      }

      return {
        success: true,
        data: conflict,
      };
    }
  )
  .post(
    "/conflicts/:id/resolve",
    async ({ ctx, params, body, set }) => {
      const conflictRepo = new SyncConflictRepository();

      const conflict = await conflictRepo.findById(
        ctx as RequestContext,
        params.id
      );

      if (!conflict) {
        set.status = 404;
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Conflict not found",
          },
        };
      }

      if (conflict.status !== "pending") {
        set.status = 400;
        return {
          success: false,
          error: {
            code: "ALREADY_RESOLVED",
            message: `Conflict already resolved with strategy: ${conflict.resolution}`,
          },
        };
      }

      const validResolutions = ["server", "local", "merge"];
      if (!validResolutions.includes(body.resolution)) {
        set.status = 400;
        return {
          success: false,
          error: {
            code: "INVALID_RESOLUTION",
            message: `Invalid resolution. Must be one of: ${validResolutions.join(", ")}`,
          },
        };
      }

      const resolvedConflict = await conflictRepo.resolve(
        ctx as RequestContext,
        params.id,
        {
          resolution: body.resolution,
          mergedData: body.mergedData,
        }
      );

      logger.info({
        msg: "✅ Conflict resolved by admin",
        conflictId: params.id,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        resolution: body.resolution,
        resolvedBy: ctx.businessUserId,
      });

      return {
        success: true,
        data: resolvedConflict,
      };
    },
    {
      body: t.Object({
        resolution: t.Union([
          t.Literal("server"),
          t.Literal("local"),
          t.Literal("merge"),
        ]),
        mergedData: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    }
  )
  // Dead Letter Queue endpoints
  .get(
    "/dead-letter",
    async ({ ctx, query }) => {
      const dlqRepo = new SyncDeadLetterRepository();

      let limit = 50;
      if (query.limit) {
        const parsedLimit = parseInt(query.limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100);
        }
      }

      let offset = 0;
      if (query.offset) {
        const parsedOffset = parseInt(query.offset, 10);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset;
        }
      }

      const [items, total] = await Promise.all([
        dlqRepo.findByBusiness(ctx as RequestContext, {
          limit,
          offset,
          entity: query.entity
            ? normalizeEntityTypeFilter(query.entity)
            : undefined,
        }),
        dlqRepo.countByBusiness(ctx as RequestContext),
      ]);

      return {
        success: true,
        data: {
          items,
          total,
          pagination: { limit, offset, hasMore: items.length === limit },
        },
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        entity: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/dead-letter/:id",
    async ({ ctx, params }) => {
      const dlqRepo = new SyncDeadLetterRepository();

      const item = await dlqRepo.findById(ctx as RequestContext, params.id);

      if (!item) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Dead letter entry not found",
          },
        };
      }

      return {
        success: true,
        data: item,
      };
    }
  )
  .delete(
    "/dead-letter/:id",
    async ({ ctx, params }) => {
      const dlqRepo = new SyncDeadLetterRepository();

      const deleted = await dlqRepo.delete(ctx as RequestContext, params.id);

      if (!deleted) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Dead letter entry not found",
          },
        };
      }

      return {
        success: true,
        data: { id: params.id, deleted: true },
      };
    }
  )
  // Sync Health Metrics endpoint
  .get(
    "/metrics",
    async ({ ctx, query }) => {
      const metricsService = new SyncMetricsService();

      let hours = 24;
      if (query.hours) {
        const parsedHours = parseInt(query.hours, 10);
        if (!isNaN(parsedHours) && parsedHours > 0) {
          hours = Math.min(parsedHours, 168); // Max 1 week
        }
      }

      const metrics = await metricsService.getMetrics(
        ctx as RequestContext,
        hours
      );

      return {
        success: true,
        data: metrics,
      };
    },
    {
      query: t.Object({
        hours: t.Optional(t.String()),
      }),
    }
  );
