// @ts-nocheck - Backend file
import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { ForbiddenError } from "../errors";

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
    async ({ saleService, ctx, body, set, error }) => {
      set.status = 201;

      // Validation for pre-orders: deliveryDate is required
      if (body.type === "pre_order" && !body.deliveryDate) {
        return error(400, { message: "La fecha de entrega es requerida para pedidos programados" });
      }
      if (body.deliveryDate && isNaN(Date.parse(body.deliveryDate))) {
        return error(400, { message: "La fecha de entrega no es una fecha válida" });
      }

      const result = await saleService.createSale(ctx as RequestContext, {
        id: body.id,
        customerId: body.customerId,
        distribucionId: body.distribucionId,
        visitaId: body.visitaId,
        type: body.type,
        saleType: body.saleType,
        totalAmount: body.totalAmount,
        amountPaid: body.amountPaid,
        tara: body.tara,
        netWeight: body.netWeight,
        deliveryDate: body.deliveryDate,
        orderDate: body.orderDate,
        saleDate: body.saleDate,
        items: body.items,
      });
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        distribucionId: t.Optional(t.String()),
        visitaId: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal("instant_sale"), t.Literal("pre_order")])),
        saleType: t.Union([t.Literal("contado"), t.Literal("credito")]),
        totalAmount: t.Number(),
        amountPaid: t.Optional(t.Number()),
        tara: t.Optional(t.Number()),
        netWeight: t.Optional(t.Number()),
        saleDate: t.Optional(t.String()),
        deliveryDate: t.Optional(t.String()),
        orderDate: t.Optional(t.String()),
        items: t.Array(
          t.Object({
            productId: t.String(),
            productName: t.String(),
            variantId: t.String(),
            variantName: t.String(),
            quantity: t.Optional(t.Number()),
            orderedQuantity: t.Optional(t.Number()),
            unitPrice: t.Optional(t.Number()),
            unitPriceQuoted: t.Optional(t.Number()),
            subtotal: t.Number(),
          })
        ),
      }),
    }
  )
  .patch(
    "/:id",
    async ({ saleService, ctx, params, body }) => {
      const result = await saleService.updateSale(ctx as RequestContext, params.id, {
        customerId: body.customerId,
        deliveryDate: body.deliveryDate,
        saleType: body.saleType,
        paymentMode: body.paymentMode,
        paymentMethod: body.paymentMethod,
        totalAmount: body.totalAmount,
        amountPaid: body.amountPaid,
        advancePaymentMethod: body.advancePaymentMethod,
        advanceReferenceNumber: body.advanceReferenceNumber,
        advanceProofImageId: body.advanceProofImageId,
      });
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        customerId: t.Optional(t.Union([t.String(), t.Null()])),
        deliveryDate: t.Optional(t.Union([t.String(), t.Null()])),
        saleType: t.Optional(t.Union([t.Literal("contado"), t.Literal("credito")])),
        paymentMode: t.Optional(
          t.Union([
            t.Literal("pago_total"),
            t.Literal("a_cuenta"),
            t.Literal("debe_todo"),
            t.Null(),
          ])
        ),
        paymentMethod: t.Optional(
          t.Union([
            t.Literal("efectivo"),
            t.Literal("yape"),
            t.Literal("plin"),
            t.Literal("transferencia"),
            t.Literal("tarjeta"),
            t.Literal("saldo"),
            t.Null(),
          ])
        ),
        totalAmount: t.Optional(t.Number({ minimum: 0 })),
        amountPaid: t.Optional(t.Number({ minimum: 0 })),
        advancePaymentMethod: t.Optional(
          t.Union([
            t.Literal("efectivo"),
            t.Literal("yape"),
            t.Literal("plin"),
            t.Literal("transferencia"),
            t.Literal("tarjeta"),
            t.Literal("saldo"),
            t.Null(),
          ])
        ),
        advanceReferenceNumber: t.Optional(t.Union([t.String(), t.Null()])),
        advanceProofImageId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .post(
    "/:id/cancel",
    async ({ saleService, ctx, params, body, set }) => {
      const sale = await saleService.cancelSale(ctx as RequestContext, params.id, {
        reason: body.reason,
        refundAmount: body.refundAmount,
        refundMethod: body.refundMethod,
        refundReference: body.refundReference,
        refundNotes: body.refundNotes,
      });
      return { success: true, data: sale };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String({ minLength: 1 }),
        refundAmount: t.Optional(t.Number({ minimum: 0 })),
        refundMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
          t.Literal("saldo"),
        ])),
        refundReference: t.Optional(t.String()),
        refundNotes: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/confirm",
    async ({ saleService, ctx, params, body }) => {
      const result = await saleService.confirmSale(
        ctx as RequestContext,
        params.id,
        body.baseVersion,
        {
          paymentMethod: body.paymentMethod,
          referenceNumber: body.referenceNumber,
          proofImageId: body.proofImageId,
        }
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        baseVersion: t.Optional(t.Number()),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
          t.Literal("tarjeta"),
          t.Literal("saldo"),
        ])),
        referenceNumber: t.Optional(t.String()),
        proofImageId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/deliver",
    async ({ saleService, ctx, params, body }) => {
      const result = await saleService.deliverPreOrder(
        ctx as RequestContext,
        params.id,
        body.baseVersion
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        baseVersion: t.Number(),
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
  )
  // Sale Items endpoints
  .get(
    "/:id/items",
    async ({ saleService, ctx, params }) => {
      const items = await saleService.getSaleItems(ctx as RequestContext, params.id);
      return { success: true, data: items };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/items",
    async ({ saleService, ctx, params, body, set }) => {
      set.status = 201;
      const result = await saleService.addItem(ctx as RequestContext, params.id, {
        productId: body.productId,
        productName: body.productName,
        variantId: body.variantId,
        variantName: body.variantName,
        quantity: body.quantity,
        orderedQuantity: body.orderedQuantity,
        unitPrice: body.unitPrice,
        unitPriceQuoted: body.unitPriceQuoted,
        subtotal: body.subtotal,
      });
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        productId: t.String(),
        productName: t.String(),
        variantId: t.String(),
        variantName: t.String(),
        quantity: t.Optional(t.Number()),
        orderedQuantity: t.Optional(t.Number()),
        unitPrice: t.Optional(t.Number()),
        unitPriceQuoted: t.Optional(t.Number()),
        subtotal: t.Number(),
      }),
    }
  )
  .patch(
    "/:id/items/:itemId",
    async ({ saleService, ctx, params, body }) => {
      const result = await saleService.updateItem(
        ctx as RequestContext,
        params.id,
        params.itemId,
        {
          quantity: body.quantity,
          orderedQuantity: body.orderedQuantity,
          unitPrice: body.unitPrice,
          unitPriceQuoted: body.unitPriceQuoted,
          unitPriceFinal: body.unitPriceFinal,
          subtotal: body.subtotal,
          deliveredQuantity: body.deliveredQuantity,
          isModified: body.isModified,
        }
      );
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
        itemId: t.String(),
      }),
      body: t.Object({
        quantity: t.Optional(t.Number()),
        orderedQuantity: t.Optional(t.Number()),
        unitPrice: t.Optional(t.Number()),
        unitPriceQuoted: t.Optional(t.Number()),
        unitPriceFinal: t.Optional(t.Number()),
        subtotal: t.Optional(t.Number()),
        deliveredQuantity: t.Optional(t.Number()),
        isModified: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id/items/:itemId",
    async ({ saleService, ctx, params, set }) => {
      await saleService.removeItem(ctx as RequestContext, params.id, params.itemId);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
        itemId: t.String(),
      }),
    }
  )
  // Token management endpoints
  .get(
    "/:id/token",
    async ({ saleTokenService, ctx, params }) => {
      const token = await saleTokenService.getTokenBySaleId(ctx as RequestContext, params.id);
      return { success: true, data: token };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/token",
    async ({ saleTokenService, ctx, params, set }) => {
      set.status = 201;
      const result = await saleTokenService.generateToken(ctx as RequestContext, params.id);
      return { success: true, data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/token/regenerate",
    async ({ saleTokenService, ctx, params }) => {
      const result = await saleTokenService.regenerateToken(ctx as RequestContext, params.id);
      return { success: true, data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/token/toggle",
    async ({ saleTokenService, ctx, params, body }) => {
      const result = await saleTokenService.toggleTokenStatus(
        ctx as RequestContext,
        params.id,
        body.isActive
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        isActive: t.Boolean(),
      }),
    }
  )
  // Draft cleanup endpoint (admin only)
  .post(
    "/cleanup-drafts",
    async ({ saleService, ctx, body }) => {
    // Only admins can run cleanup
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden limpiar borradores");
    }

    const result = await saleService.cleanupStaleDraftSales(ctx as RequestContext, {
      olderThanDays: body.olderThanDays ?? 7,
      withNoItems: body.withNoItems ?? false,
      olderThan30Days: body.olderThan30Days ?? 30,
    });

    return {
      success: true,
      data: {
        deletedCount: result.deletedCount,
        deletedIds: result.deletedIds,
      },
    };
    },
    {
      body: t.Object({
        olderThanDays: t.Optional(t.Number({ minimum: 1 })),
        withNoItems: t.Optional(t.Boolean()),
        olderThan30Days: t.Optional(t.Number({ minimum: 1 })),
      }),
    }
  );
