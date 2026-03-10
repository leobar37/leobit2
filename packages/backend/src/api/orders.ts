import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const idParamsSchema = t.Object({ id: t.String({ pattern: UUID_PATTERN }) });
const idItemIdParamsSchema = t.Object({
  id: t.String({ pattern: UUID_PATTERN }),
  itemId: t.String({ pattern: UUID_PATTERN }),
});

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
      params: idParamsSchema,
    }
  )
  .get(
    "/:id/events",
    async ({ orderService, ctx, params }) => {
      const events = await orderService.getOrderEvents(ctx as RequestContext, params.id);
      return { success: true, data: events };
    },
    {
      params: idParamsSchema,
    }
  )
  .post(
    "/",
    async ({ orderService, ctx, body, set }) => {
      set.status = 201;
      const result = await orderService.createOrder(ctx as RequestContext, {
        id: body.id,
        clientId: body.clientId,
        deliveryDate: body.deliveryDate,
        paymentIntent: body.paymentIntent,
        paymentStatus: body.paymentStatus,
        advanceAmount: body.advanceAmount,
        balanceDue: body.balanceDue,
        advancePaymentMethod: body.advancePaymentMethod,
        advanceReferenceNumber: body.advanceReferenceNumber,
        advanceProofImageId: body.advanceProofImageId,
        totalAmount: body.totalAmount,
        items: body.items,
        clientEventId: body.clientEventId,
      });

      return { success: true, data: result.data, txid: result.txid };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        clientId: t.Optional(t.String()),
        deliveryDate: t.String(),
        paymentIntent: t.Union([t.Literal("contado"), t.Literal("credito")]),
        paymentStatus: t.Optional(t.Union([
          t.Literal("sin_pago"),
          t.Literal("adelanto_parcial"),
          t.Literal("pagado_total"),
          t.Literal("saldo_pendiente"),
        ])),
        advanceAmount: t.Optional(t.Number({ minimum: 0 })),
        balanceDue: t.Optional(t.Number({ minimum: 0 })),
        advancePaymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
        ])),
        advanceReferenceNumber: t.Optional(t.String({ maxLength: 50 })),
        advanceProofImageId: t.Optional(t.String()),
        totalAmount: t.Number(),
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
  .put(
    "/:id",
    async ({ orderService, ctx, params, body }) => {
      const result = await orderService.updateOrder(ctx as RequestContext, params.id, {
        baseVersion: body.baseVersion,
        deliveryDate: body.deliveryDate,
        paymentIntent: body.paymentIntent,
        paymentStatus: body.paymentStatus,
        advanceAmount: body.advanceAmount,
        balanceDue: body.balanceDue,
        advancePaymentMethod: body.advancePaymentMethod,
        advanceReferenceNumber: body.advanceReferenceNumber,
        advanceProofImageId: body.advanceProofImageId,
        totalAmount: body.totalAmount,
        items: body.items,
        clientEventId: body.clientEventId,
      });

      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        deliveryDate: t.Optional(t.String()),
        paymentIntent: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        paymentStatus: t.Optional(t.Union([
          t.Literal("sin_pago"),
          t.Literal("adelanto_parcial"),
          t.Literal("pagado_total"),
          t.Literal("saldo_pendiente"),
        ])),
        advanceAmount: t.Optional(t.Number({ minimum: 0 })),
        balanceDue: t.Optional(t.Number({ minimum: 0 })),
        advancePaymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
        ])),
        advanceReferenceNumber: t.Optional(t.String({ maxLength: 50 })),
        advanceProofImageId: t.Optional(t.String()),
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
      const result = await orderService.confirmOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/cancel",
    async ({ orderService, ctx, params, body }) => {
      const result = await orderService.cancelOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ orderService, ctx, params, body }) => {
      const result = await orderService.deleteOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
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
        body.clientEventId,
        body.additionalPaymentAmount,
        body.paymentMethod,
        body.referenceNumber,
        body.proofImageId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        deliveredItems: t.Array(
          t.Object({
            itemId: t.String(),
            deliveredQuantity: t.Number({ minimum: 0.001 }),
            unitPriceFinal: t.Optional(t.Number({ minimum: 0 })),
          })
        ),
        additionalPaymentAmount: t.Optional(t.Number({ minimum: 0 })),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
        ])),
        referenceNumber: t.Optional(t.String({ maxLength: 50 })),
        proofImageId: t.Optional(t.String()),
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
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idItemIdParamsSchema,
      body: t.Object({
        newQuantity: t.Number({ minimum: 0.001 }),
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/token",
    async ({ orderTokenService, ctx, params }) => {
      const result = await orderTokenService.generateToken(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: result };
    },
    {
      params: idParamsSchema,
    }
  )
  .get(
    "/:id/token",
    async ({ orderTokenService, ctx, params }) => {
      const token = await orderTokenService.getTokenByOrderId(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: token };
    },
    {
      params: idParamsSchema,
    }
  )
  // Draft order endpoints for granular item management
  .post(
    "/draft",
    async ({ orderDraftService, ctx, body, set }) => {
      set.status = 201;
      const result = await orderDraftService.createDraft(
        ctx as RequestContext,
        {
          clientId: body.clientId,
          deliveryDate: body.deliveryDate,
          paymentIntent: body.paymentIntent,
        },
        body.clientEventId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      body: t.Object({
        clientId: t.String(),
        deliveryDate: t.String(),
        paymentIntent: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/drafts/my",
    async ({ orderDraftService, ctx }) => {
      const drafts = await orderDraftService.getUserDrafts(ctx as RequestContext);
      return { success: true, data: drafts };
    }
  )
  .post(
    "/:id/items",
    async ({ orderDraftService, ctx, params, body, set }) => {
      set.status = 201;
      const result = await orderDraftService.addItem(
        ctx as RequestContext,
        params.id,
        {
          productId: body.productId,
          variantId: body.variantId,
          productName: body.productName,
          variantName: body.variantName,
          orderedQuantity: body.orderedQuantity,
          unitPriceQuoted: body.unitPriceQuoted,
          baseVersion: body.baseVersion,
          clientEventId: body.clientEventId,
        }
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        productId: t.String(),
        variantId: t.String(),
        productName: t.String(),
        variantName: t.String(),
        orderedQuantity: t.Number({ minimum: 0.001 }),
        unitPriceQuoted: t.Number({ minimum: 0 }),
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id/items/:itemId",
    async ({ orderDraftService, ctx, params, body }) => {
      const result = await orderDraftService.removeItem(
        ctx as RequestContext,
        params.id,
        params.itemId,
        body.baseVersion,
        body.clientEventId
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idItemIdParamsSchema,
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id/items/:itemId/details",
    async ({ orderDraftService, ctx, params, body }) => {
      const result = await orderDraftService.updateItem(
        ctx as RequestContext,
        params.id,
        params.itemId,
        {
          orderedQuantity: body.orderedQuantity,
          unitPriceQuoted: body.unitPriceQuoted,
          baseVersion: body.baseVersion,
          clientEventId: body.clientEventId,
        }
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idItemIdParamsSchema,
      body: t.Object({
        orderedQuantity: t.Optional(t.Number({ minimum: 0.001 })),
        unitPriceQuoted: t.Optional(t.Number({ minimum: 0 })),
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id/draft-details",
    async ({ orderDraftService, ctx, params, body }) => {
      const result = await orderDraftService.updateDraftDetails(
        ctx as RequestContext,
        params.id,
        {
          clientId: body.clientId,
          deliveryDate: body.deliveryDate,
          paymentIntent: body.paymentIntent,
          baseVersion: body.baseVersion,
          clientEventId: body.clientEventId,
        }
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: idParamsSchema,
      body: t.Object({
        clientId: t.Optional(t.String()),
        deliveryDate: t.Optional(t.String()),
        paymentIntent: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        baseVersion: t.Number({ minimum: 1 }),
        clientEventId: t.Optional(t.String()),
      }),
    }
  );
