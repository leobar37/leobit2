/**
 * Elysia Adapter for Sync Routes
 *
 * Mounts sync route handlers as Elysia routes with t-schema validation.
 */

import { Elysia, t } from "elysia";
import { createSyncRouteHandlers, type SyncRouteConfig } from "../router";

export interface ElysiaSyncRouterConfig extends SyncRouteConfig {
  /** Route prefix (default: "/sync") */
  prefix?: string;
  /** Auth middleware - must provide { ctx } with tenantId and userId */
  authMiddleware?: Elysia;
}

export function createElysiaSyncRouter(config: ElysiaSyncRouterConfig): any {
  const prefix = config.prefix ?? "/sync";
  const handlers = createSyncRouteHandlers(config);

  const app = new Elysia({ prefix });

  if (config.authMiddleware) {
    app.use(config.authMiddleware);
  }

  // POST /sync/batch
  app.post(
    "/batch",
    async ({ ctx, body }: any) => {
      return handlers.postBatch(ctx, body as any);
    },
    {
      body: t.Object({
        entries: t.Array(
          t.Union([
            t.Object({
              kind: t.Literal("single"),
              operation: t.Object({
                idempotencyKey: t.String(),
                entityType: t.String(),
                entityId: t.String(),
                operation: t.Union([t.Literal("create"), t.Literal("update"), t.Literal("delete")]),
                payload: t.Record(t.String(), t.Unknown()),
                localVersion: t.Number(),
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
                  idempotencyKey: t.String(),
                  entityType: t.String(),
                  entityId: t.String(),
                  operation: t.Union([t.Literal("create"), t.Literal("update"), t.Literal("delete")]),
                  payload: t.Record(t.String(), t.Unknown()),
                  localVersion: t.Number(),
                  localTimestamp: t.String(),
                  correlationId: t.Optional(t.String()),
                  deviceId: t.Optional(t.String()),
                  sourceFingerprint: t.Optional(t.String()),
                })
              ),
            }),
          ])
        ),
      }),
    }
  );

  // GET /sync/changes
  app.get(
    "/changes",
    async ({ ctx, query }: any) => {
      return handlers.getChanges(ctx, {
        since: query.since,
        limit: query.limit,
        cursor: query.cursor,
        entityTypes: query.entityTypes,
      });
    },
    {
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
        entityTypes: t.Optional(t.String()),
      }),
    }
  );

  // GET /sync/health
  app.get("/health", async (ctx: any) => {
    return handlers.getHealth(ctx.ctx ?? ctx);
  });

  // GET /sync/metrics
  app.get(
    "/metrics",
    async ({ ctx, query }: any) => {
      return handlers.getMetrics(ctx, {
        hours: query.hours,
      });
    },
    {
      query: t.Object({
        hours: t.Optional(t.String()),
      }),
    }
  );

  // GET /sync/conflicts
  app.get(
    "/conflicts",
    async ({ ctx, query }: any) => {
      return handlers.getConflicts(ctx, {
        status: query.status,
        entityType: query.entityType,
        limit: query.limit,
        offset: query.offset,
      });
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        entityType: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  );

  // POST /sync/conflicts/:id/resolve
  app.post(
    "/conflicts/:id/resolve",
    async ({ ctx, params, body }: any) => {
      return handlers.resolveConflict(ctx, params, body as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
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

  // GET /sync/dead-letter
  app.get(
    "/dead-letter",
    async ({ ctx, query }: any) => {
      return handlers.getDeadLetter(ctx, {
        limit: query.limit,
        offset: query.offset,
        entity: query.entity,
      });
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        entity: t.Optional(t.String()),
      }),
    }
  );

  // DELETE /sync/dead-letter/:id
  app.delete(
    "/dead-letter/:id",
    async ({ ctx, params }: any) => {
      return handlers.deleteDeadLetter(ctx, params);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

  return app;
}
