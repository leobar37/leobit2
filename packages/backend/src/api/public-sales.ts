/**
 * Public Sales API
 * Customer-facing catalog and order endpoints keyed by business slug.
 */
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { businesses } from "../db/schema/businesses";
import { customers } from "../db/schema/customers";
import { sales, saleItems } from "../db/schema/sales";
import { saleTokens } from "../db/schema/sale-tokens";
import { productVariants, products, variantInventory } from "../db/schema/inventory";
import { abonos } from "../db/schema/payments";
import { NotFoundError, ValidationError, ForbiddenError } from "../errors";
import { normalizeAmount, normalizeQuantity } from "../lib/number-utils";
import { servicesPlugin } from "../plugins/services";
import { isValidTokenFormat } from "../services/business/sale-token.service";

type PublicCartItemInput = {
  productId: string;
  variantId: string;
  quantity: number;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function serializeDate(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function serializeDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function serializeSale(saleData: typeof sales.$inferSelect, items: Array<typeof saleItems.$inferSelect>) {
  return {
    id: saleData.id,
    type: saleData.type,
    saleDate: serializeDateTime(saleData.saleDate),
    deliveryDate: serializeDate(saleData.deliveryDate),
    orderDate: serializeDate(saleData.orderDate),
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
  };
}

async function getBusinessBySlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.publicCatalogSlug, normalizedSlug));

  if (!business || !business.isActive) {
    throw new NotFoundError("Catálogo");
  }

  return business;
}

async function getTokenSaleContext(slug: string, token: string) {
  if (!isValidTokenFormat(token)) {
    throw new ValidationError("Token inválido");
  }

  const business = await getBusinessBySlug(slug);
  const [tokenRecord] = await db
    .select({ token: saleTokens, sale: sales })
    .from(saleTokens)
    .innerJoin(sales, eq(sales.id, saleTokens.saleId))
    .where(and(eq(saleTokens.token, token), eq(sales.businessId, business.id)));

  if (!tokenRecord) {
    throw new NotFoundError("Venta");
  }

  if (!tokenRecord.token.isActive) {
    throw new ForbiddenError("El token no está activo");
  }

  if (tokenRecord.token.expiresAt && new Date() > tokenRecord.token.expiresAt) {
    throw new ForbiddenError("El enlace ha expirado");
  }

  await db
    .update(saleTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(saleTokens.id, tokenRecord.token.id));

  return { business, tokenData: tokenRecord.token, saleData: tokenRecord.sale };
}

async function loadSaleItems(saleId: string) {
  return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
}

async function loadCatalog(businessId: string) {
  const catalogRows = await db
    .select({
      productId: products.id,
      productName: products.name,
      productType: products.type,
      productUnit: products.unit,
      productImageId: products.imageId,
      variantId: productVariants.id,
      variantName: productVariants.name,
      variantPrice: productVariants.price,
      variantUnitQuantity: productVariants.unitQuantity,
      variantSortOrder: productVariants.sortOrder,
      stockQuantity: variantInventory.quantity,
    })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(variantInventory, eq(variantInventory.variantId, productVariants.id))
    .where(
      and(
        eq(products.businessId, businessId),
        eq(products.isActive, true),
        eq(productVariants.isActive, true)
      )
    );

  const productsMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      unit: string;
      imageId: string | null;
      variants: Array<{
        id: string;
        productId: string;
        name: string;
        price: string;
        unitQuantity: string;
        stockQuantity: string;
        sortOrder: number;
      }>;
    }
  >();

  for (const row of catalogRows) {
    if (!productsMap.has(row.productId)) {
      productsMap.set(row.productId, {
        id: row.productId,
        name: row.productName,
        type: row.productType,
        unit: row.productUnit,
        imageId: row.productImageId,
        variants: [],
      });
    }

    productsMap.get(row.productId)?.variants.push({
      id: row.variantId,
      productId: row.productId,
      name: row.variantName,
      price: row.variantPrice,
      unitQuantity: row.variantUnitQuantity,
      stockQuantity: row.stockQuantity ?? "0",
      sortOrder: row.variantSortOrder,
    });
  }

  return Array.from(productsMap.values()).map((product) => ({
    ...product,
    variants: product.variants.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

async function validateStock(
  variantId: string,
  requestedQuantity: number,
  currentQuantity = 0
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

async function getVariantForBusiness(businessId: string, variantId: string) {
  const [variant] = await db
    .select({ variant: productVariants, product: products })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.businessId, businessId),
        eq(products.businessId, businessId),
        eq(productVariants.isActive, true),
        eq(products.isActive, true)
      )
    );

  if (!variant) {
    throw new NotFoundError("Variante del producto");
  }

  return variant;
}

async function recalculateSaleTotal(saleId: string, isPreOrder: boolean) {
  const allItems = await loadSaleItems(saleId);
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
    .where(eq(sales.id, saleId))
    .returning();

  return { updatedSale, updatedItems: await loadSaleItems(saleId) };
}

function validatePublicCustomerInput(customerName?: string, customerPhone?: string) {
  if (!customerName || customerName.trim().length < 2) {
    throw new ValidationError("El nombre es requerido");
  }
  if (!customerPhone || customerPhone.trim().length < 6) {
    throw new ValidationError("El teléfono es requerido");
  }
}

async function createPublicCustomer(
  tx: DbTransaction,
  businessId: string,
  input: { customerName?: string; customerPhone?: string; notes?: string }
) {
  validatePublicCustomerInput(input.customerName, input.customerPhone);

  const [customer] = await tx
    .insert(customers)
    .values({
      businessId,
      name: input.customerName!.trim(),
      phone: input.customerPhone!.trim(),
      notes: input.notes?.trim() || null,
    })
    .returning();

  return customer;
}

async function createPublicPreOrder(
  businessId: string,
  input: {
    customerName?: string;
    customerPhone?: string;
    deliveryDate?: string;
    notes?: string;
    items?: PublicCartItemInput[];
  }
) {
  validatePublicCustomerInput(input.customerName, input.customerPhone);

  if (!input.deliveryDate || isNaN(Date.parse(input.deliveryDate))) {
    throw new ValidationError("La fecha de entrega es requerida");
  }

  if (!input.items?.length) {
    throw new ValidationError("Agrega al menos un producto al pedido");
  }

  const mergedItems = new Map<string, PublicCartItemInput>();
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new ValidationError("Cantidad inválida");
    }

    const existing = mergedItems.get(item.variantId);
    mergedItems.set(item.variantId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: (existing?.quantity ?? 0) + item.quantity,
    });
  }

  const saleItemsInput: Array<{
    businessId: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: string | null;
    orderedQuantity: string | null;
    unitPrice: string | null;
    unitPriceQuoted: string | null;
    subtotal: string;
  }> = [];
  let totalAmount = 0;

  for (const item of mergedItems.values()) {
    await validateStock(item.variantId, item.quantity);
    const variant = await getVariantForBusiness(businessId, item.variantId);
    const unitPrice = normalizeAmount(parseFloat(variant.variant.price), 2, "unitPrice");
    const subtotal = normalizeAmount(item.quantity * parseFloat(unitPrice), 2, "subtotal");
    totalAmount += parseFloat(subtotal);

    saleItemsInput.push({
      businessId,
      productId: variant.product.id,
      variantId: item.variantId,
      productName: variant.product.name,
      variantName: variant.variant.name,
      quantity: null,
      orderedQuantity: normalizeQuantity(item.quantity, "quantity"),
      unitPrice: null,
      unitPriceQuoted: unitPrice,
      subtotal,
    });
  }

  return db.transaction(async (tx) => {
    const customer = await createPublicCustomer(tx, businessId, input);
    const [sale] = await tx
      .insert(sales)
      .values({
        businessId,
        customerId: customer.id,
        sellerId: null,
        type: "pre_order",
        saleType: "contado",
        totalAmount: normalizeAmount(totalAmount, 2, "totalAmount"),
        amountPaid: "0.00",
        balanceDue: "0.00",
        deliveryDate: input.deliveryDate,
        orderDate: todayDateString(),
        status: "confirmed",
        allowCustomerEdit: false,
      })
      .returning();

    if (saleItemsInput.length > 0) {
      await tx.insert(saleItems).values(
        saleItemsInput.map((item) => ({
          ...item,
          saleId: sale.id,
        }))
      );
    }

    return serializeSale(sale, await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id)));
  });
}

export const publicSaleRoutes = new Elysia({ prefix: "/public/venta" })
  .use(servicesPlugin)
  .get(
    "/:slug",
    async ({ params, query }) => {
      const business = await getBusinessBySlug(params.slug);
      const token = query.token;

      let sale = null;

      if (token) {
        const context = await getTokenSaleContext(params.slug, token);
        const items = await loadSaleItems(context.saleData.id);
        sale = serializeSale(context.saleData, items);
      } else if (!business.publicCatalogEnabled) {
        throw new ForbiddenError("El catálogo público no está activo");
      }

      return {
        success: true,
        data: {
          business: {
            id: business.id,
            name: business.name,
            phone: business.phone,
            address: business.address,
            logoUrl: business.logoUrl,
            publicCatalogSlug: business.publicCatalogSlug,
            publicCatalogEnabled: business.publicCatalogEnabled,
          },
          catalog: await loadCatalog(business.id),
          sale,
        },
      };
    },
    {
      params: t.Object({ slug: t.String() }),
      query: t.Object({ token: t.Optional(t.String()) }),
    }
  )
  .post(
    "/:slug/items",
    async ({ params, body }) => {
      const { saleData, tokenData } = await getTokenSaleContext(params.slug, body.token);

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida para esta venta");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden modificar ventas en borrador");
      }

      const variant = await getVariantForBusiness(saleData.businessId, body.variantId);
      const [existingItem] = await db
        .select()
        .from(saleItems)
        .where(and(eq(saleItems.saleId, saleData.id), eq(saleItems.variantId, body.variantId)));

      const isPreOrder = saleData.type === "pre_order";
      const currentQty = existingItem
        ? parseFloat(isPreOrder ? existingItem.orderedQuantity || "0" : existingItem.quantity || "0")
        : 0;
      const newTotalQty = currentQty + body.quantity;

      await validateStock(body.variantId, newTotalQty, currentQty);

      if (existingItem) {
        const newQuantity = normalizeQuantity(newTotalQty, "quantity");
        await db
          .update(saleItems)
          .set(isPreOrder ? { orderedQuantity: newQuantity } : { quantity: newQuantity })
          .where(eq(saleItems.id, existingItem.id));
      } else {
        const unitPrice = normalizeAmount(parseFloat(variant.variant.price), 2, "unitPrice");
        const subtotal = normalizeAmount(body.quantity * parseFloat(unitPrice), 2, "subtotal");

        await db.insert(saleItems).values({
          businessId: saleData.businessId,
          saleId: saleData.id,
          productId: variant.variant.productId,
          variantId: body.variantId,
          productName: variant.product.name,
          variantName: variant.variant.name,
          quantity: isPreOrder ? null : normalizeQuantity(body.quantity, "quantity"),
          orderedQuantity: isPreOrder ? normalizeQuantity(body.quantity, "quantity") : null,
          unitPrice: isPreOrder ? null : unitPrice,
          unitPriceQuoted: isPreOrder ? unitPrice : null,
          subtotal,
        });
      }

      const { updatedSale, updatedItems } = await recalculateSaleTotal(saleData.id, isPreOrder);

      return {
        success: true,
        data: { ...serializeSale(updatedSale, updatedItems), token: tokenData.token },
      };
    },
    {
      params: t.Object({ slug: t.String() }),
      body: t.Object({
        token: t.String(),
        productId: t.String(),
        variantId: t.String(),
        quantity: t.Number({ minimum: 0.001 }),
      }),
    }
  )
  .patch(
    "/:slug/items/:itemId",
    async ({ params, body }) => {
      const { saleData } = await getTokenSaleContext(params.slug, body.token);

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden modificar ventas en borrador");
      }

      if (saleData.version !== body.baseVersion) {
        throw new ValidationError("La venta fue modificada. Por favor recarga la página.");
      }

      const [existingItem] = await db
        .select()
        .from(saleItems)
        .where(and(eq(saleItems.id, params.itemId), eq(saleItems.saleId, saleData.id)));

      if (!existingItem) {
        throw new NotFoundError("Item de la venta");
      }

      const isPreOrder = saleData.type === "pre_order";
      const currentQty = parseFloat(isPreOrder ? existingItem.orderedQuantity || "0" : existingItem.quantity || "0");

      await validateStock(existingItem.variantId, body.quantity, currentQty);

      if (body.quantity <= 0) {
        await db.delete(saleItems).where(eq(saleItems.id, params.itemId));
      } else {
        const newQty = normalizeQuantity(body.quantity, "quantity");
        await db
          .update(saleItems)
          .set(isPreOrder ? { orderedQuantity: newQty } : { quantity: newQty })
          .where(eq(saleItems.id, params.itemId));
      }

      const { updatedSale, updatedItems } = await recalculateSaleTotal(saleData.id, isPreOrder);

      return { success: true, data: serializeSale(updatedSale, updatedItems) };
    },
    {
      params: t.Object({ slug: t.String(), itemId: t.String() }),
      body: t.Object({
        token: t.String(),
        quantity: t.Number({ minimum: 0 }),
        baseVersion: t.Number({ minimum: 1 }),
      }),
    }
  )
  .delete(
    "/:slug/items/:itemId",
    async ({ params, body }) => {
      const { saleData } = await getTokenSaleContext(params.slug, body.token);

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden eliminar items de ventas en borrador");
      }

      if (saleData.version !== body.baseVersion) {
        throw new ValidationError("La venta fue modificada. Por favor recarga la página.");
      }

      const [existingItem] = await db
        .select()
        .from(saleItems)
        .where(and(eq(saleItems.id, params.itemId), eq(saleItems.saleId, saleData.id)));

      if (!existingItem) {
        throw new NotFoundError("Item de la venta");
      }

      await db.delete(saleItems).where(eq(saleItems.id, params.itemId));
      await recalculateSaleTotal(saleData.id, saleData.type === "pre_order");

      return { success: true, data: { message: "Item eliminado" } };
    },
    {
      params: t.Object({ slug: t.String(), itemId: t.String() }),
      body: t.Object({
        token: t.String(),
        baseVersion: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post(
    "/:slug/cancel",
    async ({ params, body }) => {
      const { saleData, tokenData } = await getTokenSaleContext(params.slug, body.token);

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden cancelar ventas en borrador");
      }

      await db
        .update(sales)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(sales.id, saleData.id));

      await db
        .update(saleTokens)
        .set({ isActive: false })
        .where(eq(saleTokens.id, tokenData.id));

      return { success: true, data: { message: "Venta cancelada exitosamente", saleId: saleData.id } };
    },
    {
      params: t.Object({ slug: t.String() }),
      body: t.Object({ token: t.String() }),
    }
  )
  .post(
    "/:slug/confirmar",
    async ({ params, body }) => {
      if (!body.token) {
        const business = await getBusinessBySlug(params.slug);
        if (!business.publicCatalogEnabled) {
          throw new ForbiddenError("El catálogo público no está activo");
        }

        const sale = await createPublicPreOrder(business.id, body);
        return { success: true, data: { message: "Pedido confirmado exitosamente", saleId: sale.id, status: sale.status } };
      }

      const { saleData } = await getTokenSaleContext(params.slug, body.token);

      if (!saleData.allowCustomerEdit) {
        throw new ForbiddenError("La edición por cliente no está permitida");
      }

      if (saleData.status !== "draft") {
        throw new ValidationError("Solo se pueden confirmar ventas en borrador");
      }

      const saleItemsList = await loadSaleItems(saleData.id);
      if (saleItemsList.length === 0) {
        throw new ValidationError("No puedes confirmar una venta sin productos");
      }

      const newStatus = saleData.type === "pre_order" ? "confirmed" : "active";
      const customer = await db.transaction(async (tx) => createPublicCustomer(tx, saleData.businessId, body));

      await db
        .update(sales)
        .set({
          customerId: customer.id,
          deliveryDate: body.deliveryDate || saleData.deliveryDate,
          status: newStatus,
          allowCustomerEdit: false,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleData.id));

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
      params: t.Object({ slug: t.String() }),
      body: t.Object({
        token: t.Optional(t.String()),
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        deliveryDate: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        items: t.Optional(
          t.Array(
            t.Object({
              productId: t.String(),
              variantId: t.String(),
              quantity: t.Number({ minimum: 0.001 }),
            })
          )
        ),
      }),
    }
  )
  .get(
    "/:slug/detalle",
    async ({ params, query }) => {
      const token = query.token;
      if (!token) {
        throw new ValidationError("Token requerido");
      }

      const context = await getTokenSaleContext(params.slug, token);
      const { business, saleData } = context;

      // Only allow viewing finalized sales
      const allowedStatuses = ["active", "delivered", "confirmed"];
      if (!allowedStatuses.includes(saleData.status)) {
        throw new ForbiddenError("Esta venta aún no está disponible para compartir");
      }

      const items = await loadSaleItems(saleData.id);
      const payments = await loadSalePayments(saleData.id);

      return {
        success: true,
        data: {
          business: {
            name: business.name,
            phone: business.phone,
            address: business.address,
            logoUrl: business.logoUrl,
          },
          sale: {
            id: saleData.id,
            status: saleData.status,
            saleType: saleData.saleType,
            totalAmount: saleData.totalAmount,
            amountPaid: saleData.amountPaid,
            balanceDue: saleData.balanceDue,
            saleDate: serializeDateTime(saleData.saleDate),
            deliveryDate: serializeDate(saleData.deliveryDate),
            items: items.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            payments: payments.map((p) => ({
              amount: p.amount,
              paymentDate: serializeDateTime(p.createdAt),
              method: p.paymentMethod,
            })),
          },
        },
      };
    },
    {
      params: t.Object({ slug: t.String() }),
      query: t.Object({ token: t.String() }),
    }
  );

async function loadSalePayments(saleId: string) {
  return db
    .select()
    .from(abonos)
    .where(eq(abonos.relatedSaleId, saleId))
    .orderBy(abonos.createdAt);
}
