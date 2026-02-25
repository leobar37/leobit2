import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const orderRoutes = new Elysia({ prefix: "/orders" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ orderService, ctx, query }) => {
      const orders = await orderService.getOrders(ctx as RequestContext, {
        deliveryDateFrom: query.deliveryDateFrom,
        deliveryDateTo: query.deliveryDateTo,
        status: query.status as "draft" | "confirmed" | "cancelled" | "delivered" | undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
      });

      return { success: true, data: orders };
    },
    {
      query: t.Object({
        deliveryDateFrom: t.Optional(t.String()),
        deliveryDateTo: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal("draft"),
            t.Literal("confirmed"),
            t.Literal("cancelled"),
            t.Literal("delivered"),
          ])
        ),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ orderService, ctx, params }) => {
      const order = await orderService.getOrder(ctx as RequestContext, params.id);
      return { success: true, data: order };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .get(
    "/:id/events",
    async ({ orderService, ctx, params }) => {
      const events = await orderService.getOrderEvents(ctx as RequestContext, params.id);
      return { success: true, data: events };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/",
    async ({ orderService, ctx, body, set }) => {
      set.status = 201;
      const order = await orderService.createOrder(ctx as RequestContext, {
        clientId: body.clientId,
        deliveryDate: body.deliveryDate,
        paymentIntent: body.paymentIntent,
        totalAmount: body.totalAmount,
        items: body.items,
        clientEventId: body.clientEventId,
      });

      return { success: true, data: order };
    },
    {
      body: t.Object({
        clientId: t.String(),
        deliveryDate: t.String(),
        paymentIntent: t.Union([t.Literal("contado"), t.Literal("credito")]),
        totalAmount: t.Number(),
        items: t.Array(
          t.Object({
            productId: t.String(),
            variantId: t.String(),
            productName: t.String(),
            variantName: t.String(),
            orderedQuantity: t.Number({ minimum: 0.001 }),
            unitPriceQuoted: t.Number({ minimum: 0 }),
          })
        ),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ orderService, ctx, params, body }) => {
      const order = await orderService.updateOrder(ctx as RequestContext, params.id, {
        baseVersion: body.baseVersion,
        deliveryDate: body.deliveryDate,
        paymentIntent: body.paymentIntent,
        totalAmount: body.totalAmount,
        items: body.items,
        clientEventId: body.clientEventId,
      });

      return { success: true, data: order };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        deliveryDate: t.Optional(t.String()),
        paymentIntent: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        totalAmount: t.Optional(t.Number({ minimum: 0 })),
        items: t.Optional(
          t.Array(
            t.Object({
              productId: t.String(),
              variantId: t.String(),
              productName: t.String(),
              variantName: t.String(),
              orderedQuantity: t.Number({ minimum: 0.001 }),
              unitPriceQuoted: t.Number({ minimum: 0 }),
            })
          )
        ),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/confirm",
    async ({ orderService, ctx, params, body }) => {
      const order = await orderService.confirmOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: order };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/cancel",
    async ({ orderService, ctx, params, body }) => {
      const order = await orderService.cancelOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: order };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/deliver",
    async ({ orderService, ctx, params, body }) => {
      const result = await orderService.convertToSale(
        ctx as RequestContext,
        params.id,
        body.deliveredItems,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        deliveredItems: t.Array(
          t.Object({
            itemId: t.String(),
            deliveredQuantity: t.Number({ minimum: 0.001 }),
            unitPriceFinal: t.Optional(t.Number({ minimum: 0 })),
          })
        ),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id/items/:itemId",
    async ({ orderService, ctx, params, body }) => {
      const result = await orderService.modifyOrderItem(
        ctx as RequestContext,
        params.id,
        params.itemId,
        body.newQuantity,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({ id: t.String(), itemId: t.String() }),
      body: t.Object({
        newQuantity: t.Number({ minimum: 0.001 }),
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  );
