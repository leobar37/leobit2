import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const syncRoutes = new Elysia({ prefix: "/sync" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/batch",
    async ({ syncService, ctx, body }) => {
      const result = await syncService.processBatch(
        ctx as RequestContext,
        body.operations
      );
      return { success: true, data: result };
    },
    {
      body: t.Object({
        operations: t.Array(
          t.Object({
            operationId: t.String(),
            entity: t.Union([
              t.Literal("customers"),
              t.Literal("sales"),
              t.Literal("sale_items"),
              t.Literal("abonos"),
              t.Literal("distribuciones"),
            ]),
            action: t.Union([
              t.Literal("insert"),
              t.Literal("update"),
              t.Literal("delete"),
            ]),
            entityId: t.String(),
            payload: t.Record(t.String(), t.Unknown()),
            clientTimestamp: t.String(),
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
