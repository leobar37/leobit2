import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const saleRoutes = new Elysia({ prefix: "/sales" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ saleService, ctx, query }) => {
      const sales = await saleService.getSales(ctx as RequestContext, {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        saleType: query.saleType as "contado" | "credito" | undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: sales };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        saleType: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/today-stats",
    async ({ saleService, ctx }) => {
      const stats = await saleService.getTodayStats(ctx as RequestContext);
      return { success: true, data: stats };
    }
  )
  .get(
    "/:id",
    async ({ saleService, ctx, params }) => {
      const sale = await saleService.getSale(ctx as RequestContext, params.id);
      return { success: true, data: sale };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ saleService, ctx, body, set }) => {
      set.status = 201;
      const sale = await saleService.createSale(ctx as RequestContext, {
        clientId: body.clientId,
        saleType: body.saleType,
        totalAmount: body.totalAmount,
        amountPaid: body.amountPaid,
        tara: body.tara,
        netWeight: body.netWeight,
        items: body.items,
      });
      return { success: true, data: sale };
    },
    {
      body: t.Object({
        clientId: t.Optional(t.String()),
        saleType: t.Union([t.Literal("contado"), t.Literal("credito")]),
        totalAmount: t.Number(),
        amountPaid: t.Optional(t.Number()),
        tara: t.Optional(t.Number()),
        netWeight: t.Optional(t.Number()),
        items: t.Array(
          t.Object({
            productId: t.String(),
            productName: t.String(),
            variantId: t.String(),
            variantName: t.String(),
            quantity: t.Number(),
            unitPrice: t.Number(),
            subtotal: t.Number(),
          })
        ),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ saleService, ctx, params, set }) => {
      await saleService.deleteSale(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
