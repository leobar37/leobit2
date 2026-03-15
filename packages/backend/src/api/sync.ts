import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { createLogger } from "../lib/logger";

const logger = createLogger("SyncRoute");

export const syncRoutes = new Elysia({ prefix: "/sync" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/batch",
    async ({ syncService, ctx, body }) => {
      // Log incoming sync batch request
      const salesOps = body.operations.filter((op: { entityType: string }) => op.entityType === "sales");
      const updateOps = salesOps.filter((op: { operation: string }) => op.operation === "update");

      logger.info({
        msg: "📥 SYNC BATCH REQUEST",
        businessId: ctx.businessId,
        userId: ctx.businessUserId,
        totalOperations: body.operations.length,
        operationsByEntity: body.operations.reduce((acc: Record<string, number>, op: { entityType: string }) => {
          acc[op.entityType] = (acc[op.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        salesOperations: salesOps.length,
        saleUpdates: updateOps.length,
        saleUpdateIds: updateOps.map((op: { entityId: string }) => op.entityId),
      });

      const startTime = Date.now();
      const result = await syncService.processBatch(
        ctx as RequestContext,
        body.operations
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
            idempotencyKey: t.String(),
            entityType: t.Union([
              t.Literal("customers"),
              t.Literal("sales"),
              t.Literal("sale_items"),
              t.Literal("abonos"),
              t.Literal("distribuciones"),
            ]),
            entityId: t.String(),
            operation: t.Union([
              t.Literal("create"),
              t.Literal("update"),
              t.Literal("delete"),
            ]),
            payload: t.Record(t.String(), t.Unknown()),
            localVersion: t.Number(),
            localTimestamp: t.String(),
            syncGroupId: t.Optional(t.String()),
          })
        ),
      }),
    }
  )
  .get(
    "/changes",
    async ({ syncService, ctx, query }) => {
      const since = query.since ? new Date(query.since) : undefined;
      const limit = query.limit ? parseInt(query.limit, 10) : undefined;

      const result = await syncService.getChanges(
        ctx as RequestContext,
        since,
        limit
      );

      return { success: true, data: result };
    },
    {
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
