import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ paymentService, ctx, query }) => {
      const payments = await paymentService.getPayments(ctx as RequestContext, {
        clientId: query.clientId,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: payments };
    },
    {
      query: t.Object({
        clientId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ paymentService, ctx, params }) => {
      const payment = await paymentService.getPayment(ctx as RequestContext, params.id);
      return { success: true, data: payment };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ paymentService, ctx, body, set }) => {
      set.status = 201;
      const payment = await paymentService.createPayment(ctx as RequestContext, {
        ...body,
        amount: parseFloat(body.amount),
      });
      return { success: true, data: payment };
    },
    {
      body: t.Object({
        clientId: t.String(),
        amount: t.String(),
        paymentMethod: t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
        ]),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ paymentService, ctx, params, set }) => {
      await paymentService.deletePayment(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
