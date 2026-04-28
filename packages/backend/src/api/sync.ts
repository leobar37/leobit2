import { Elysia, t } from "elysia";
import { SYNC_ENTITIES } from "@avileo/shared";
import type { SyncEntity } from "@avileo/shared";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { createLogger } from "../lib/logger";
import type { SyncBatchEntry } from "../services/business/sync.service";
import { parseCursor } from "./sync-cursor";

const logger = createLogger("SyncRoute");

const MAX_BATCH_SIZE = 100;
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

function parseIntParam(value: string | undefined, min: number, max: number, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

export const syncRoutes = new Elysia({ prefix: "/sync" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/batch",
    async ({ syncService, ctx, body, set }) => {
      const entries = body.entries;

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

      const limit = parseIntParam(query.limit, 1, MAX_CHANGES_LIMIT, DEFAULT_CHANGES_LIMIT);

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
        entityTypes: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/health",
    async ({ syncService, ctx }) => {
      const health = await syncService.getHealth(ctx as RequestContext);
      const { syncLogger } = await import("../lib/sync-logger");

      return {
        success: true,
        data: {
          ...health,
          metrics: syncLogger.getMetrics(),
          errorSummary: syncLogger.getErrorSummary(),
          recentErrors: syncLogger.getRecentErrors(10),
        },
      };
    }
  )
  .get(
    "/conflicts",
    async ({ syncService, ctx, query }) => {
      const limit = parseIntParam(query.limit, 1, 100, 50);
      const offset = parseIntParam(query.offset, 0, 10000, 0);

      const result = await syncService.getConflicts(ctx as RequestContext, {
        status: query.status || "pending",
        entityType: query.entityType
          ? normalizeEntityTypeFilter(query.entityType)
          : undefined,
        limit,
        offset,
      });

      return {
        success: true,
        data: {
          conflicts: result.conflicts,
          pendingCount: result.pending,
          pagination: {
            limit,
            offset,
            hasMore: result.conflicts.length === limit,
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
    async ({ syncService, ctx, params }) => {
      const result = await syncService.getConflicts(ctx as RequestContext, {
        status: "pending",
        limit: 1,
        offset: 0,
      });

      const conflict = result.conflicts.find((c: any) => c.id === params.id);

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
    async ({ syncService, ctx, params, body, set }) => {
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

      try {
        const resolvedConflict = await syncService.resolveConflict(
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
          resolution: body.resolution,
          resolvedBy: ctx.businessUserId,
        });

        return {
          success: true,
          data: resolvedConflict,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not found")) {
          set.status = 404;
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Conflict not found",
            },
          };
        }
        if (message.includes("already resolved")) {
          set.status = 400;
          return {
            success: false,
            error: {
              code: "ALREADY_RESOLVED",
              message,
            },
          };
        }
        throw error;
      }
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
  .get(
    "/dead-letter",
    async ({ syncService, ctx, query }) => {
      const limit = parseIntParam(query.limit, 1, 100, 50);
      const offset = parseIntParam(query.offset, 0, 10000, 0);

      const result = await syncService.getDeadLetterItems(ctx as RequestContext, {
        limit,
        offset,
        entity: query.entity
          ? normalizeEntityTypeFilter(query.entity)
          : undefined,
      });

      return {
        success: true,
        data: {
          items: result.items,
          total: result.total,
          pagination: { limit, offset, hasMore: result.items.length === limit },
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
    async ({ syncService, ctx, params }) => {
      const result = await syncService.getDeadLetterItems(ctx as RequestContext, {
        limit: 1,
        offset: 0,
      });

      const item = result.items.find((i: any) => i.id === params.id);

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
    async ({ syncService, ctx, params }) => {
      const deleted = await syncService.deleteDeadLetterItem(
        ctx as RequestContext,
        params.id
      );

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
  .get(
    "/metrics",
    async ({ syncService, ctx, query }) => {
      const hours = parseIntParam(query.hours, 1, 168, 24);

      const metrics = await syncService.getMetrics(
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
