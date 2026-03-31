import { Elysia, t } from "elysia";
import { SYNC_ENTITIES } from "@avileo/shared";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { createLogger } from "../lib/logger";
import { SyncConflictRepository } from "../services/sync/framework/SyncConflictRepository";
import type { SyncOperationInput } from "../services/sync/types";

const logger = createLogger("SyncRoute");

// Maximum operations per batch request
const MAX_BATCH_SIZE = 100;

// Maximum limit for /sync/changes
const MAX_CHANGES_LIMIT = 500;
const DEFAULT_CHANGES_LIMIT = 100;

const entityLiterals = SYNC_ENTITIES.map((entity) => t.Literal(entity)) as [
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
      const operations = body.operations as SyncOperationInput[];

      // Enforce batch size limit
      if (operations.length > MAX_BATCH_SIZE) {
        set.status = 400;
        return {
          success: false,
          error: {
            code: "BATCH_TOO_LARGE",
            message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} operations. Received: ${operations.length}`,
            maxBatchSize: MAX_BATCH_SIZE,
          },
        };
      }

      // Validate each operation has required fields
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.idempotencyKey || typeof op.idempotencyKey !== "string") {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "INVALID_OPERATION",
              message: `Operation at index ${i} missing valid idempotencyKey`,
              index: i,
            },
          };
        }
        if (!op.entityId || typeof op.entityId !== "string") {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "INVALID_OPERATION",
              message: `Operation at index ${i} missing valid entityId`,
              index: i,
            },
          };
        }
        // Validate timestamp is parseable
        if (op.localTimestamp) {
          const ts = new Date(op.localTimestamp);
          if (isNaN(ts.getTime())) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: "INVALID_OPERATION",
                message: `Operation at index ${i} has invalid localTimestamp`,
                index: i,
              },
            };
          }
        }
      }

      // Log incoming sync batch request
      const salesOps = operations.filter((op) => op.entityType === "sales");
      const updateOps = salesOps.filter((op) => op.operation === "update");

      logger.info({
        msg: "📥 SYNC BATCH REQUEST",
        businessId: ctx.businessId,
        userId: ctx.businessUserId,
        totalOperations: operations.length,
        operationsByEntity: operations.reduce((acc: Record<string, number>, op) => {
          acc[op.entityType] = (acc[op.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        salesOperations: salesOps.length,
        saleUpdates: updateOps.length,
        saleUpdateIds: updateOps.map((op) => op.entityId),
      });

      const startTime = Date.now();
      const result = await syncService.processBatch(
        ctx as RequestContext,
        operations
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
            syncGroupId: t.Optional(t.String()),
          }),
          { minItems: 1, maxItems: MAX_BATCH_SIZE }
        ),
      }),
    }
  )
  .get(
    "/changes",
    async ({ syncService, ctx, query, set }) => {
      // Parse and validate since timestamp
      let since: Date | undefined;
      if (query.since) {
        since = new Date(query.since);
        if (isNaN(since.getTime())) {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "INVALID_SINCE",
              message: "Invalid 'since' timestamp. Must be a valid ISO 8601 date string.",
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

      const result = await syncService.getChanges(
        ctx as RequestContext,
        since,
        limit,
        query.syncGroupId
      );

      return { success: true, data: result };
    },
    {
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        syncGroupId: t.Optional(t.String()),
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
          entityType: query.entityType,
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
  );
