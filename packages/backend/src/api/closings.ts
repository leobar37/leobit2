import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const closingRoutes = new Elysia({ prefix: "/closings" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ closingService, ctx, query }) => {
      const closings = await closingService.getClosings(ctx as RequestContext, {
        sellerId: query.sellerId,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: closings };
    },
    {
      query: t.Object({
        sellerId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/today-stats",
    async ({ closingService, ctx }) => {
      const stats = await closingService.getTodayStats(ctx as RequestContext);
      return { success: true, data: stats };
    }
  )
  .get(
    "/:id",
    async ({ closingService, ctx, params }) => {
      const closing = await closingService.getClosing(ctx as RequestContext, params.id);
      return { success: true, data: closing };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ closingService, ctx, body, set }) => {
      set.status = 201;
      const closing = await closingService.createClosing(ctx as RequestContext, {
        closingDate: body.closingDate,
        totalSales: body.totalSales,
        totalAmount: parseFloat(body.totalAmount),
        cashAmount: parseFloat(body.cashAmount),
        creditAmount: parseFloat(body.creditAmount),
        totalKilos: body.totalKilos ? parseFloat(body.totalKilos) : undefined,
        backdateReason: body.backdateReason,
      });
      return { success: true, data: closing };
    },
    {
      body: t.Object({
        closingDate: t.String(),
        totalSales: t.Number(),
        totalAmount: t.String(),
        cashAmount: t.String(),
        creditAmount: t.String(),
        totalKilos: t.Optional(t.String()),
        backdateReason: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ closingService, ctx, params, body }) => {
      const closing = await closingService.updateClosing(ctx as RequestContext, params.id, {
        totalSales: body.totalSales,
        totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : undefined,
        cashAmount: body.cashAmount ? parseFloat(body.cashAmount) : undefined,
        creditAmount: body.creditAmount ? parseFloat(body.creditAmount) : undefined,
        totalKilos: body.totalKilos ? parseFloat(body.totalKilos) : undefined,
      });
      return { success: true, data: closing };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        totalSales: t.Optional(t.Number()),
        totalAmount: t.Optional(t.String()),
        cashAmount: t.Optional(t.String()),
        creditAmount: t.Optional(t.String()),
        totalKilos: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ closingService, ctx, params, set }) => {
      await closingService.deleteClosing(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
