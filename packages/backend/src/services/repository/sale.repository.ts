import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import { sales, saleItems, type Sale, type NewSale, type SaleItem, type NewSaleItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateSaleInput {
  id?: string;
  customerId?: string;
  type?: "instant_sale" | "pre_order";
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara?: string;
  netWeight?: string;
  saleDate?: string;
  deliveryDate?: string;
  orderDate?: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity?: string;
    orderedQuantity?: string;
    unitPrice?: string;
    unitPriceQuoted?: string;
    subtotal: string;
  }>;
}

export class SaleRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      saleType?: "contado" | "credito";
      type?: "instant_sale" | "pre_order";
      status?: "draft" | "confirmed" | "active" | "delivered" | "cancelled";
      limit?: number;
      offset?: number;
    }
  ): Promise<Sale[]> {
    const query: any = {
      where: and(
        eq(sales.businessId, ctx.businessId),
        eq(sales.sellerId, ctx.businessUserId),
        filters?.startDate ? gte(sales.saleDate, filters.startDate) : undefined,
        filters?.endDate ? lte(sales.saleDate, filters.endDate) : undefined,
        filters?.saleType ? eq(sales.saleType, filters.saleType) : undefined,
        filters?.type ? eq(sales.type, filters.type) : undefined,
        filters?.status ? eq(sales.status, filters.status) : undefined
      ),
      orderBy: desc(sales.createdAt),
      with: {
        items: true,
        customer: true,
      },
    };

    // Only add limit/offset if they have valid values
    if (filters?.limit && filters.limit > 0) {
      query.limit = filters.limit;
    }
    if (filters?.offset && filters.offset > 0) {
      query.offset = filters.offset;
    }

    return db.query.sales.findMany(query);
  }

  async findById(ctx: RequestContext, id: string): Promise<Sale | undefined> {
    const start = Date.now();
    logger.debug({ id, businessId: ctx.businessId }, "🔍 SaleRepository.findById");

    const result = await db.query.sales.findFirst({
      where: and(
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId)
      ),
      with: {
        items: true,
        customer: true,
      },
    });

    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({ id, duration, hasItems: !!result?.items?.length, hasCustomer: !!result?.customer }, "⚠️ Slow query: findById");
    } else {
      logger.debug({ id, duration, found: !!result }, "✅ SaleRepository.findById");
    }
    return result;
  }



  async create(ctx: RequestContext, data: CreateSaleInput, tx?: DbTransaction): Promise<Sale> {
    const start = Date.now();
    logger.info({ id: data.id, businessId: ctx.businessId, saleType: data.saleType, totalAmount: data.totalAmount }, "📝 SaleRepository.create");

    const { items, id, customerId, type, saleType, totalAmount, amountPaid, balanceDue, tara, netWeight, saleDate, deliveryDate, orderDate } = data;

    const executor = tx ?? db;

    const saleValues = {
      customerId: customerId ?? null,
      type: type ?? "instant_sale",
      saleType,
      totalAmount,
      amountPaid,
      balanceDue,
      tara: tara ?? null,
      netWeight: netWeight ?? null,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      orderDate: orderDate ? new Date(orderDate) : null,
      businessId: ctx.businessId,
      sellerId: ctx.businessUserId,
      ...(id ? { id } : {}),
    } as typeof sales.$inferInsert;

    const [sale] = await executor
      .insert(sales)
      .values(saleValues)
      .returning();

    const duration = Date.now() - start;
    logger.info({ id: sale.id, duration }, "✅ SaleRepository.create completed");

    if (items && items.length > 0) {
      await executor.insert(saleItems).values(
        items.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          // For instant_sales
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          // For pre_orders
          orderedQuantity: item.orderedQuantity,
          unitPriceQuoted: item.unitPriceQuoted,
          subtotal: item.subtotal,
        }))
      );
    }

    return sale;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(sales)
      .where(and(
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId)
      ));
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<
      Pick<
        Sale,
        | "status"
        | "cancelledAt"
        | "cancelledBy"
        | "cancelReason"
        | "refundAmount"
        | "refundDate"
        | "refundMethod"
        | "refundReference"
        | "refundNotes"
        | "version"
        | "confirmedSnapshot"
        | "deliveredSnapshot"
        | "deliveryDate"
        | "saleType"
        | "paymentMode"
        | "totalAmount"
        | "amountPaid"
        | "balanceDue"
        | "customerId"
      >
    >,
    tx?: DbTransaction
  ): Promise<Sale> {
    const executor = tx ?? db;

    const [sale] = await executor
      .update(sales)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(sales.id, id), eq(sales.businessId, ctx.businessId)))
      .returning();

    return sale;
  }

  async confirmPreOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    tx?: DbTransaction
  ): Promise<Sale> {
    const executor = tx ?? db;

    // Get current sale with items for snapshot
    const sale = await this.findById(ctx, id);
    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.version !== baseVersion) {
      throw new Error("Version conflict - sale was modified");
    }

    const [updated] = await executor
      .update(sales)
      .set({
        status: "confirmed",
        version: baseVersion + 1,
        confirmedSnapshot: {
          items: sale.items,
          totalAmount: sale.totalAmount,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sales.id, id),
          eq(sales.businessId, ctx.businessId),
          eq(sales.version, baseVersion)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to confirm - version mismatch");
    }

    return updated;
  }

  async deliverPreOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    tx?: DbTransaction
  ): Promise<Sale> {
    const executor = tx ?? db;

    const sale = await this.findById(ctx, id);
    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.version !== baseVersion) {
      throw new Error("Version conflict - sale was modified");
    }

    const [updated] = await executor
      .update(sales)
      .set({
        status: "delivered",
        version: baseVersion + 1,
        deliveredSnapshot: {
          items: sale.items,
          totalAmount: sale.totalAmount,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sales.id, id),
          eq(sales.businessId, ctx.businessId),
          eq(sales.version, baseVersion)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to deliver - version mismatch");
    }

    return updated;
  }

  async count(ctx: RequestContext, filters?: { startDate?: Date; endDate?: Date }): Promise<number> {
    const result = await db
      .select({ count: db.$count(sales) })
      .from(sales)
      .where(and(
        eq(sales.businessId, ctx.businessId),
        filters?.startDate ? gte(sales.saleDate, filters.startDate) : undefined,
        filters?.endDate ? lte(sales.saleDate, filters.endDate) : undefined
      ));

    return result[0]?.count ?? 0;
  }

  async getTotalSalesToday(ctx: RequestContext): Promise<{ count: number; total: string }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(and(
        eq(sales.businessId, ctx.businessId),
        eq(sales.sellerId, ctx.businessUserId),
        gte(sales.saleDate, today)
      ));

    const totalResult = await db
      .select({ total: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), '0')` })
      .from(sales)
      .where(and(
        eq(sales.businessId, ctx.businessId),
        eq(sales.sellerId, ctx.businessUserId),
        gte(sales.saleDate, today)
      ));

    return {
      count: countResult[0]?.count ?? 0,
      total: totalResult[0]?.total ?? "0",
    };
  }

  async findSaleItems(
    ctx: RequestContext,
    saleId: string,
    tx?: DbTransaction
  ): Promise<SaleItem[]> {
    const executor = tx ?? db;
    const results = await executor
      .select({ item: saleItems })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(and(
        eq(sales.id, saleId),
        eq(sales.businessId, ctx.businessId)
      ));
    return results.map(r => r.item);
  }

  async findItemById(
    ctx: RequestContext,
    saleId: string,
    itemId: string,
    tx?: DbTransaction
  ): Promise<SaleItem | undefined> {
    const executor = tx ?? db;
    const results = await executor
      .select({ item: saleItems })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(and(
        eq(saleItems.id, itemId),
        eq(sales.id, saleId),
        eq(sales.businessId, ctx.businessId)
      ));
    return results[0]?.item;
  }

  async addItem(
    ctx: RequestContext,
    saleId: string,
    data: {
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      quantity?: string;
      orderedQuantity?: string;
      unitPrice?: string;
      unitPriceQuoted?: string;
      subtotal: string;
    },
    tx?: DbTransaction
  ): Promise<SaleItem> {
    const executor = tx ?? db;

    const [item] = await executor
      .insert(saleItems)
      .values({
        saleId,
        productId: data.productId,
        productName: data.productName,
        variantId: data.variantId,
        variantName: data.variantName,
        quantity: data.quantity,
        orderedQuantity: data.orderedQuantity,
        unitPrice: data.unitPrice,
        unitPriceQuoted: data.unitPriceQuoted,
        subtotal: data.subtotal,
      })
      .returning();

    return item;
  }

  async updateItem(
    ctx: RequestContext,
    saleId: string,
    itemId: string,
    data: {
      quantity?: string;
      orderedQuantity?: string;
      unitPrice?: string;
      unitPriceQuoted?: string;
      unitPriceFinal?: string;
      subtotal?: string;
      deliveredQuantity?: string;
      isModified?: boolean;
    },
    tx?: DbTransaction
  ): Promise<SaleItem> {
    const executor = tx ?? db;

    const [item] = await executor
      .update(saleItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(saleItems.id, itemId),
          eq(saleItems.saleId, saleId)
        )
      )
      .returning();

    return item;
  }

  async deleteItem(
    ctx: RequestContext,
    saleId: string,
    itemId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    await executor
      .delete(saleItems)
      .where(
        and(
          eq(saleItems.id, itemId),
          eq(saleItems.saleId, saleId)
        )
      );
  }

  async updateTotalAmount(
    ctx: RequestContext,
    saleId: string,
    totalAmount: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    await executor
      .update(sales)
      .set({
        totalAmount,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sales.id, saleId),
          eq(sales.businessId, ctx.businessId)
        )
      );
  }
}
