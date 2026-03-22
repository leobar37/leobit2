/**
 * Public Sales API
 * Endpoints for customers to view and edit sales via token
 * Similar to public-orders but for the unified sales system
 */
import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { sales, saleItems } from "../db/schema/sales";
import { saleTokens } from "../db/schema/sale-tokens";
import { productVariants, products, variantInventory } from "../db/schema/inventory";
import { NotFoundError, ValidationError, ForbiddenError } from "../errors";
import { normalizeAmount, normalizeQuantity } from "../lib/number-utils";
import { servicesPlugin } from "../plugins/services";
import { isValidTokenFormat } from "../services/business/sale-token.service";

const TOKEN_LENGTH = 12;

/**
 * Validates that requested quantity is available in stock
 */
async function validateStock(
  variantId: string,
  requestedQuantity: number,
  currentQuantity: number = 0
): Promise<void> {
  const [stock] = await db
    .select({ quantity: variantInventory.quantity })
    .from(variantInventory)
    .where(eq(variantInventory.variantId, variantId));

  const availableStock = stock ? parseFloat(stock.quantity) : 0;
  const quantityDelta = requestedQuantity - currentQuantity;

  if (quantityDelta > availableStock) {
    throw new ValidationError("Stock insuficiente");
  }
}

export const publicSaleRoutes = new Elysia({
  prefix: "/public/venta",
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
          token: saleTokens,
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Venta no encontrada");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ValidationError("Token inactivo");
      }

      await db
        .update(saleTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(saleTokens.id, tokenData.id));

      const [saleData] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, tokenData.saleId));

      if (!saleData) {
        throw new NotFoundError("Venta no encontrada");
      }

      const items = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleData.id));

      return {
        success: true,
        data: {
          id: saleData.id,
          type: saleData.type,
          saleDate: saleData.saleDate,
          deliveryDate: saleData.deliveryDate,
          orderDate: saleData.orderDate,
          status: saleData.status,
          saleType: saleData.saleType,
          totalAmount: saleData.totalAmount,
          version: saleData.version,
          allowCustomerEdit: saleData.allowCustomerEdit,
          items: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            orderedQuantity: item.orderedQuantity,
            deliveredQuantity: item.deliveredQuantity,
            unitPrice: item.unitPrice,
            unitPriceQuoted: item.unitPriceQuoted,
            unitPriceFinal: item.unitPriceFinal,
            subtotal: item.subtotal,
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
          token: saleTokens,
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token de la venta");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      const [saleData] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, tokenData.saleId));

      if (!saleData) {
        throw new NotFoundError("Venta");
      }

      // Validate allowCustomerEdit
      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida para esta venta");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden modificar ventas en borrador");
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
            eq(products.businessId, saleData.businessId)
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
        .from(saleItems)
        .where(
          and(
            eq(saleItems.saleId, saleData.id),
            eq(saleItems.variantId, body.variantId)
          )
        );

      const isPreOrder = saleData.type === "pre_order";
      const currentQty = existingItem
        ? parseFloat(isPreOrder ? existingItem.orderedQuantity || "0" : existingItem.quantity || "0")
        : 0;
      const newTotalQty = currentQty + body.quantity;

      await validateStock(body.variantId, newTotalQty, currentQty);

      if (existingItem) {
        const newQuantity = normalizeQuantity(newTotalQty, "quantity");

        if (isPreOrder) {
          await db
            .update(saleItems)
            .set({ orderedQuantity: newQuantity })
            .where(eq(saleItems.id, existingItem.id));
        } else {
          await db
            .update(saleItems)
            .set({ quantity: newQuantity })
            .where(eq(saleItems.id, existingItem.id));
        }
      } else {
        const unitPrice = normalizeAmount(
          parseFloat(variant.variant.price),
          2,
          "unitPrice"
        );
        const subtotal = normalizeAmount(
          body.quantity * parseFloat(unitPrice),
          2,
          "subtotal"
        );

        await db.insert(saleItems).values({
          businessId: saleData.businessId,
          saleId: saleData.id,
          productId: variant.variant.productId,
          variantId: body.variantId,
          productName: variant.product?.name ?? "Producto",
          variantName: variant.variant.name,
          quantity: isPreOrder ? null : normalizeQuantity(body.quantity, "quantity"),
          orderedQuantity: isPreOrder ? normalizeQuantity(body.quantity, "quantity") : null,
          unitPrice: isPreOrder ? null : unitPrice,
          unitPriceQuoted: isPreOrder ? unitPrice : null,
          subtotal,
        });
      }

      // Recalculate total
      const allItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleData.id));

      const newTotal = allItems.reduce((sum, item) => {
        const qty = parseFloat(
          isPreOrder ? item.orderedQuantity || item.quantity || "0" : item.quantity || "0"
        );
        const price = parseFloat(
          isPreOrder ? item.unitPriceQuoted || item.unitPrice || "0" : item.unitPrice || "0"
        );
        return sum + qty * price;
      }, 0);

      const normalizedTotal = normalizeAmount(newTotal, 2, "totalAmount");

      const [updatedSale] = await db
        .update(sales)
        .set({
          totalAmount: normalizedTotal,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleData.id))
        .returning();

      const updatedItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleData.id));

      return {
        success: true,
        data: {
          id: updatedSale.id,
          type: updatedSale.type,
          saleDate: updatedSale.saleDate,
          deliveryDate: updatedSale.deliveryDate,
          status: updatedSale.status,
          totalAmount: updatedSale.totalAmount,
          version: updatedSale.version,
          items: updatedItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            orderedQuantity: item.orderedQuantity,
            unitPrice: item.unitPrice,
            unitPriceQuoted: item.unitPriceQuoted,
            subtotal: item.subtotal,
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
    async ({ params, body }) => {
      const { token, itemId } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: saleTokens,
          sale: { id: sales.id, status: sales.status, allowCustomerEdit: sales.allowCustomerEdit },
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token de la venta");
      }

      if (!tokenRecord.token.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      if (!tokenRecord.sale.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (tokenRecord.sale.status !== "draft") {
        throw new ValidationError("Solo se pueden eliminar items de ventas en borrador");
      }

      // Check version for optimistic locking
      const [saleData] = await db
        .select({ version: sales.version })
        .from(sales)
        .where(eq(sales.id, tokenRecord.sale.id));

      if (saleData.version !== body.baseVersion) {
        throw new ValidationError("La venta fue modificada. Por favor recarga la página.");
      }

      const [existingItem] = await db
        .select()
        .from(saleItems)
        .where(and(eq(saleItems.id, itemId), eq(saleItems.saleId, tokenRecord.sale.id)));

      if (!existingItem) {
        throw new NotFoundError("Item de la venta");
      }

      await db.delete(saleItems).where(eq(saleItems.id, itemId));

      // Recalculate total
      const allItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, tokenRecord.sale.id));

      const isPreOrder = (await db.select({ type: sales.type }).from(sales).where(eq(sales.id, tokenRecord.sale.id)))[0]?.type === "pre_order";

      const newTotal = allItems.reduce((sum, item) => {
        const qty = parseFloat(
          isPreOrder ? item.orderedQuantity || item.quantity || "0" : item.quantity || "0"
        );
        const price = parseFloat(
          isPreOrder ? item.unitPriceQuoted || item.unitPrice || "0" : item.unitPrice || "0"
        );
        return sum + qty * price;
      }, 0);

      await db
        .update(sales)
        .set({
          totalAmount: normalizeAmount(newTotal, 2, "totalAmount"),
          updatedAt: new Date(),
        })
        .where(eq(sales.id, tokenRecord.sale.id));

      return { success: true, data: { message: "Item eliminado" } };
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
  )
  .patch(
    "/:token/items/:itemId",
    async ({ params, body }) => {
      const { token, itemId } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: saleTokens,
          sale: { id: sales.id, status: sales.status, allowCustomerEdit: sales.allowCustomerEdit },
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token de la venta");
      }

      if (!tokenRecord.token.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      if (!tokenRecord.sale.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (tokenRecord.sale.status !== "draft") {
        throw new ValidationError("Solo se pueden modificar ventas en borrador");
      }

      // Check version
      const [saleData] = await db
        .select({ version: sales.version, type: sales.type })
        .from(sales)
        .where(eq(sales.id, tokenRecord.sale.id));

      if (saleData.version !== body.baseVersion) {
        throw new ValidationError("La venta fue modificada. Por favor recarga la página.");
      }

      const [existingItem] = await db
        .select()
        .from(saleItems)
        .where(and(eq(saleItems.id, itemId), eq(saleItems.saleId, tokenRecord.sale.id)));

      if (!existingItem) {
        throw new NotFoundError("Item de la venta");
      }

      const isPreOrder = saleData.type === "pre_order";
      const currentQty = parseFloat(
        isPreOrder ? existingItem.orderedQuantity || "0" : existingItem.quantity || "0"
      );

      await validateStock(existingItem.variantId, body.quantity, currentQty);

      if (body.quantity <= 0) {
        await db.delete(saleItems).where(eq(saleItems.id, itemId));
      } else {
        const newQty = normalizeQuantity(body.quantity, "quantity");
        if (isPreOrder) {
          await db
            .update(saleItems)
            .set({ orderedQuantity: newQty })
            .where(eq(saleItems.id, itemId));
        } else {
          await db
            .update(saleItems)
            .set({ quantity: newQty })
            .where(eq(saleItems.id, itemId));
        }
      }

      // Recalculate total
      const allItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, tokenRecord.sale.id));

      const newTotal = allItems.reduce((sum, item) => {
        const qty = parseFloat(
          isPreOrder ? item.orderedQuantity || item.quantity || "0" : item.quantity || "0"
        );
        const price = parseFloat(
          isPreOrder ? item.unitPriceQuoted || item.unitPrice || "0" : item.unitPrice || "0"
        );
        return sum + qty * price;
      }, 0);

      const [updatedSale] = await db
        .update(sales)
        .set({
          totalAmount: normalizeAmount(newTotal, 2, "totalAmount"),
          updatedAt: new Date(),
        })
        .where(eq(sales.id, tokenRecord.sale.id))
        .returning();

      const updatedItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, tokenRecord.sale.id));

      return {
        success: true,
        data: {
          id: updatedSale.id,
          status: updatedSale.status,
          totalAmount: updatedSale.totalAmount,
          version: updatedSale.version,
          items: updatedItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            orderedQuantity: item.orderedQuantity,
            unitPrice: item.unitPrice,
            unitPriceQuoted: item.unitPriceQuoted,
            subtotal: item.subtotal,
          })),
        },
      };
    },
    {
      params: t.Object({
        token: t.String(),
        itemId: t.String(),
      }),
      body: t.Object({
        quantity: t.Number({ minimum: 0 }),
        baseVersion: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post(
    "/:token/cancel",
    async ({ params }) => {
      const { token } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: saleTokens,
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token de la venta");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      const [saleData] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, tokenData.saleId));

      if (!saleData) {
        throw new NotFoundError("Venta");
      }

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden cancelar ventas en borrador");
      }

      await db
        .update(sales)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleData.id));

      await db
        .update(saleTokens)
        .set({ isActive: false })
        .where(eq(saleTokens.id, tokenData.id));

      return {
        success: true,
        data: {
          message: "Venta cancelada exitosamente",
          saleId: saleData.id,
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
    }
  )
  .post(
    "/:token/confirmar",
    async ({ params, body }) => {
      const { token } = params;

      if (!isValidTokenFormat(token)) {
        throw new ValidationError("Token inválido");
      }

      const [tokenRecord] = await db
        .select({
          token: saleTokens,
        })
        .from(saleTokens)
        .innerJoin(sales, eq(sales.id, saleTokens.saleId))
        .where(and(eq(saleTokens.token, token)));

      if (!tokenRecord) {
        throw new NotFoundError("Token de la venta");
      }

      const tokenData = tokenRecord.token;

      if (!tokenData.isActive) {
        throw new ForbiddenError("El token no está activo");
      }

      const [saleData] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, tokenData.saleId));

      if (!saleData) {
        throw new NotFoundError("Venta");
      }

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden confirmar ventas en borrador");
      }

      // Determine new status based on sale type
      const newStatus = saleData.type === "pre_order" ? "confirmed" : "active";

      await db
        .update(sales)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleData.id));

      // Optionally deactivate token after confirmation
      // await db.update(saleTokens).set({ isActive: false }).where(eq(saleTokens.id, tokenData.id));

      return {
        success: true,
        data: {
          message: newStatus === "confirmed" ? "Pedido confirmado exitosamente" : "Venta confirmada exitosamente",
          saleId: saleData.id,
          status: newStatus,
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
      body: t.Object({
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        deliveryDate: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  );
