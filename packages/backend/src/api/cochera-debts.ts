import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const cocheraDebtRoutes = new Elysia({ prefix: "/cochera" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/debts",
    async ({ cocheraDebtService, ctx, query }) => {
      const debts = await cocheraDebtService.listDebts(ctx as RequestContext, {
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: debts };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/sessions/:id/payments",
    async ({ cocheraDebtService, ctx, params, body, set }) => {
      set.status = 201;
      const result = await cocheraDebtService.createPayment(
        ctx as RequestContext,
        params.id,
        body
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        amount: t.Number({ minimum: 0.01 }),
        paymentMethod: t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
        ]),
        referenceNumber: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        proofImageId: t.Optional(t.Nullable(t.String())),
        notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
      }),
    }
  );
