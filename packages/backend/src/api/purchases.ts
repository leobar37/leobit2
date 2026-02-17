import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const purchaseRoutes = new Elysia({ prefix: "/purchases" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ purchaseService, ctx, query }) => {
      const purchases = await purchaseService.getPurchases(ctx as RequestContext, {
        supplierId: query.supplierId,
        status: query.status as "pending" | "received" | "cancelled" | undefined,
        startDate: query.startDate,
        endDate: query.endDate,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: purchases };
    },
    {
      query: t.Object({
        supplierId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ purchaseService, ctx, params }) => {
      const purchase = await purchaseService.getPurchase(ctx as RequestContext, params.id);
      return { success: true, data: purchase };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ purchaseService, ctx, body, set }) => {
      set.status = 201;
      const purchase = await purchaseService.createPurchase(ctx as RequestContext, {
        supplierId: body.supplierId,
        purchaseDate: body.purchaseDate,
        invoiceNumber: body.invoiceNumber,
        notes: body.notes,
        items: body.items,
      });
      return { success: true, data: purchase };
    },
    {
      body: t.Object({
        supplierId: t.String(),
        purchaseDate: t.String(),
        invoiceNumber: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        items: t.Array(
          t.Object({
            productId: t.String(),
            variantId: t.Optional(t.String()),
            quantity: t.Number({ minimum: 0.001 }),
            unitCost: t.Number({ minimum: 0 }),
          })
        ),
      }),
    }
  )
  .put(
    "/:id/status",
    async ({ purchaseService, ctx, params, body }) => {
      const purchase = await purchaseService.updatePurchaseStatus(
        ctx as RequestContext,
        params.id,
        body.status
      );
      return { success: true, data: purchase };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal("pending"),
          t.Literal("received"),
          t.Literal("cancelled"),
        ]),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ purchaseService, ctx, params, set }) => {
      await purchaseService.deletePurchase(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
