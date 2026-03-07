import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { orderTokens } from "../db/schema/order-tokens";
import { orders, orderItems } from "../db/schema/orders";
import { productVariants, products } from "../db/schema";
import { NotFoundError, ValidationError, ForbiddenError } from "../errors";
import { normalizeAmount, normalizeQuantity } from "../lib/number-utils";
import { servicesPlugin } from "../plugins/services";

const TOKEN_LENGTH = 12;

function isValidTokenFormat(token: string): boolean {
  return token.length === TOKEN_LENGTH && /^[a-zA-Z0-9_-]+$/.test(token);
}

export const publicOrderRoutes = new Elysia({
  prefix: "/public/pedido",
})
  .use(servicesPlugin)
  .get(
    "/:token",
    async ({ params }) => {
      const { token } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: orderTokens,
        })
        .from(orderTokens)
        .innerJoin(orders, eq(orders.id, orderTokens.orderId))
        .where(and(eq(orderTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Pedido no encontrado");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ValidationError("Token inactivo");
      }

      await db
        .update(orderTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(orderTokens.id, tokenData.id));

      const [orderData] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, tokenData.orderId));

      if (!orderData) {
        throw new NotFoundError("Pedido no encontrado");
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderData.id));

      return {
        success: true,
        data: {
          id: orderData.id,
          orderDate: orderData.orderDate,
          deliveryDate: orderData.deliveryDate,
          status: orderData.status,
          paymentIntent: orderData.paymentIntent,
          totalAmount: orderData.totalAmount,
          version: orderData.version,
          items: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            orderedQuantity: item.orderedQuantity,
            deliveredQuantity: item.deliveredQuantity,
            unitPriceQuoted: item.unitPriceQuoted,
            unitPriceFinal: item.unitPriceFinal,
          })),
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
    }
  )
  .post(
    "/:token/items",
    async ({ params, body }) => {
      const { token } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: orderTokens,
        })
        .from(orderTokens)
        .innerJoin(orders, eq(orders.id, orderTokens.orderId))
        .where(and(eq(orderTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token del pedido");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      const [orderData] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, tokenData.orderId));

      if (!orderData) {
        throw new NotFoundError("Pedido");
      }

      if (orderData.status !== "draft") {
        throw new ValidationError("Solo se pueden modificar pedidos en borrador");
      }

      const [variant] = await db
        .select({
          variant: productVariants,
          product: products,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(productVariants.id, body.variantId),
            eq(products.businessId, orderData.businessId)
          )
        );

      if (!variant) {
        throw new NotFoundError("Variante del producto");
      }

      if (!variant.variant.isActive) {
        throw new ValidationError("La variante no está activa");
      }

      const [existingItem] = await db
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.orderId, orderData.id),
            eq(orderItems.variantId, body.variantId)
          )
        );

      if (existingItem) {
        const newQuantity = normalizeQuantity(
          parseFloat(existingItem.orderedQuantity) + body.quantity,
          "quantity"
        );

        await db
          .update(orderItems)
          .set({ orderedQuantity: newQuantity })
          .where(eq(orderItems.id, existingItem.id));
      } else {
        await db.insert(orderItems).values({
          orderId: orderData.id,
          productId: variant.variant.productId,
          variantId: body.variantId,
          productName: variant.product?.name ?? "Producto",
          variantName: variant.variant.name,
          orderedQuantity: normalizeQuantity(body.quantity, "quantity"),
          unitPriceQuoted: normalizeAmount(
            parseFloat(variant.variant.price),
            2,
            "unitPriceQuoted"
          ),
        });
      }

      const allItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderData.id));

      const newTotal = allItems.reduce((sum, item) => {
        return (
          sum +
          parseFloat(item.orderedQuantity) * parseFloat(item.unitPriceQuoted)
        );
      }, 0);

      const normalizedTotal = normalizeAmount(newTotal, 2, "totalAmount");

      const [updatedOrder] = await db
        .update(orders)
        .set({
          totalAmount: normalizedTotal,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderData.id))
        .returning();

      const updatedItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderData.id));

      return {
        success: true,
        data: {
          id: updatedOrder.id,
          orderDate: updatedOrder.orderDate,
          deliveryDate: updatedOrder.deliveryDate,
          status: updatedOrder.status,
          paymentIntent: updatedOrder.paymentIntent,
          totalAmount: updatedOrder.totalAmount,
          version: updatedOrder.version,
          items: updatedItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            orderedQuantity: item.orderedQuantity,
            deliveredQuantity: item.deliveredQuantity,
            unitPriceQuoted: item.unitPriceQuoted,
            unitPriceFinal: item.unitPriceFinal,
          })),
          token: tokenData.token,
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
      body: t.Object({
        productId: t.String(),
        variantId: t.String(),
        quantity: t.Number({ minimum: 0.001 }),
      }),
    }
  )
  .delete(
    "/:token/items/:itemId",
    async ({ orderService, orderTokenService, params, body }) => {
      const { token, itemId } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const tokenValidation = await orderTokenService.validateTokenPublic(token);
      if (!tokenValidation.valid || !tokenValidation.tokenRecord) {
        throw new ValidationError("Token inválido o inactivo");
      }

      const order = tokenValidation.tokenRecord.order;
      if (order.status !== "draft") {
        throw new ValidationError("Solo se pueden eliminar items de pedidos en borrador");
      }

      const result = await orderService.deleteOrderItemPublic(
        order.id,
        itemId,
        order.businessId,
        body.baseVersion
      );

      return { success: true, data: result };
    },
    {
      params: t.Object({
        token: t.String(),
        itemId: t.String(),
      }),
      body: t.Object({
        baseVersion: t.Number({ minimum: 1 }),
      }),
    }
  );
