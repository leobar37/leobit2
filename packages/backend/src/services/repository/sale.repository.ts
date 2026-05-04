import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import { sales, saleItems, type Sale, type NewSale, type SaleItem, type NewSaleItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import { toDateColumnValue, toTimestampColumnValue } from "../../lib/date-utils";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateSaleInput {
  id?: string;
  sellerId?: string;
  customerId?: string;
  distribucionId?: string;
  visitaId?: string;
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

  async findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<Sale | undefined> {
    const start = Date.now();
    logger.debug({ id, businessId: ctx.businessId }, "🔍 SaleRepository.findById");

    const executor = tx ?? db;

    const result = await executor.query.sales.findFirst({
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

    const { items, id, sellerId, customerId, distribucionId, visitaId, type, saleType, totalAmount, amountPaid, balanceDue, tara, netWeight, saleDate, deliveryDate, orderDate } = data;

    const executor = tx ?? db;

    const saleValues = {
      customerId: customerId ?? null,
      distribucionId: distribucionId ?? null,
      visitaId: visitaId ?? null,
      type: type ?? "instant_sale",
      saleType,
      totalAmount,
      amountPaid,
      balanceDue,
      tara: tara ?? null,
      netWeight: netWeight ?? null,
      saleDate: toTimestampColumnValue(saleDate),
      deliveryDate: toDateColumnValue(deliveryDate),
      orderDate: toDateColumnValue(orderDate),
      businessId: ctx.businessId,
      sellerId: sellerId ?? ctx.businessUserId,
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
          businessId: ctx.businessId,
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

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;

    await executor
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
        | "deliveryDate"
        | "saleType"
        | "paymentMode"
        | "paymentMethod"
        | "totalAmount"
        | "amountPaid"
        | "balanceDue"
        | "customerId"
      >
    >,
    tx?: DbTransaction,
    expectedVersion?: number
  ): Promise<Sale> {
    const executor = tx ?? db;

    const conditions = [
      eq(sales.id, id),
      eq(sales.businessId, ctx.businessId)
    ];

    if (expectedVersion !== undefined) {
      conditions.push(eq(sales.version, expectedVersion));
    }

    const [sale] = await executor
      .update(sales)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (expectedVersion !== undefined && !sale) {
      throw new Error(`Version conflict: expected ${expectedVersion}`);
    }

    return sale;
  }

  async updateWithItems(
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
        | "deliveryDate"
        | "saleType"
        | "paymentMode"
        | "paymentMethod"
        | "totalAmount"
        | "amountPaid"
        | "balanceDue"
        | "customerId"
      >
    > & {
      items?: Array<{
        id?: string;
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
    },
    tx?: DbTransaction,
    expectedVersion?: number
  ): Promise<Sale> {
    const { items, ...saleData } = data;

    // Helper function to execute the update logic
    const executeUpdate = async (executor: DbTransaction) => {
      const conditions = [
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId)
      ];

      if (expectedVersion !== undefined) {
        conditions.push(eq(sales.version, expectedVersion));
      }

      // Update the sale
      const [sale] = await executor
        .update(sales)
        .set({ ...saleData, updatedAt: new Date() })
        .where(and(...conditions))
        .returning();

      if (!sale) {
        if (expectedVersion !== undefined) {
          throw new Error(`Version conflict: expected ${expectedVersion}`);
        }
        throw new Error("Sale not found");
      }

      // If items are provided, sync them with the database
      if (items !== undefined) {
        // Get existing items
        const existingItems = await executor
          .select({ id: saleItems.id })
          .from(saleItems)
          .innerJoin(sales, eq(sales.id, saleItems.saleId))
          .where(and(eq(sales.id, id), eq(sales.businessId, ctx.businessId)));

        const existingItemIds = new Set(existingItems.map((i) => i.id));
        const processedItemIds = new Set<string>();

        // Process each item in the payload
        for (const item of items) {
          if (item.id && existingItemIds.has(item.id)) {
            // Update existing item
            await executor
              .update(saleItems)
              .set({
                productId: item.productId,
                productName: item.productName,
                variantId: item.variantId,
                variantName: item.variantName,
                quantity: item.quantity ?? null,
                orderedQuantity: item.orderedQuantity ?? null,
                unitPrice: item.unitPrice ?? null,
                unitPriceQuoted: item.unitPriceQuoted ?? null,
                subtotal: item.subtotal,
                updatedAt: new Date(),
              })
              .where(and(eq(saleItems.id, item.id), eq(saleItems.saleId, id)));
            processedItemIds.add(item.id);
          } else {
            // Create new item - use provided ID for idempotency
            const newItemId = item.id ?? crypto.randomUUID();
            await executor.insert(saleItems).values({
              id: newItemId,
              businessId: ctx.businessId,
              saleId: id,
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity ?? null,
              orderedQuantity: item.orderedQuantity ?? null,
              unitPrice: item.unitPrice ?? null,
              unitPriceQuoted: item.unitPriceQuoted ?? null,
              subtotal: item.subtotal,
            });
            processedItemIds.add(newItemId);
          }
        }

        // Delete items that are not in the payload
        for (const existingId of existingItemIds) {
          if (!processedItemIds.has(existingId)) {
            await executor
              .delete(saleItems)
              .where(and(eq(saleItems.id, existingId), eq(saleItems.saleId, id)));
          }
        }
      }

      // Return updated sale with items
      return (
        (await this.findById(ctx, id, executor)) ??
        (() => {
          throw new Error("Sale not found after update");
        })()
      );
    };

    // Use provided transaction or create new one
    if (tx) {
      return executeUpdate(tx);
    }
    return db.transaction(executeUpdate);
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
      id?: string;
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
        id: data.id,
        businessId: ctx.businessId,
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
          eq(saleItems.saleId, saleId),
          eq(saleItems.businessId, ctx.businessId)
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
          eq(saleItems.saleId, saleId),
          eq(saleItems.businessId, ctx.businessId)
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
        version: sql`${sales.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sales.id, saleId),
          eq(sales.businessId, ctx.businessId)
        )
      );
  }

  /**
   * Recalculate sale totals atomically using SQL.
   * This prevents race conditions by calculating the sum directly in the database.
   */
  async recalculateTotalsAtomically(
    ctx: RequestContext,
    saleId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    await executor
      .update(sales)
      .set({
        totalAmount: sql`(
          SELECT COALESCE(SUM(${saleItems.subtotal}), 0)
          FROM ${saleItems}
          WHERE ${saleItems.saleId} = ${saleId}
        )`,
        balanceDue: sql`GREATEST((
          SELECT COALESCE(SUM(${saleItems.subtotal}), 0)
          FROM ${saleItems}
          WHERE ${saleItems.saleId} = ${saleId}
        ) - ${sales.amountPaid}, 0)`,
        version: sql`${sales.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sales.id, saleId),
          eq(sales.businessId, ctx.businessId)
        )
      );
  }

  /**
   * Find stale draft sales for cleanup
   * @param options.olderThanDays - Delete drafts older than X days
   * @param options.withNoItems - Only delete drafts with no items
   */
  async findDrafts(
    ctx: RequestContext,
    options: {
      olderThanDays: number;
      withNoItems?: boolean;
    }
  ): Promise<Sale[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);

    const conditions = [
      eq(sales.businessId, ctx.businessId),
      eq(sales.status, "draft"),
      lte(sales.createdAt, cutoffDate),
    ];

    const staleDrafts = await db
      .select()
      .from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt));

    // If withNoItems is true, also filter out drafts that have items
    if (options.withNoItems) {
      const draftsWithItems = await db
        .select({ saleId: saleItems.saleId })
        .from(saleItems)
        .groupBy(saleItems.saleId)
        .having(sql`COUNT(*) >= 1`);

      const draftIds = staleDrafts.map((d) => d.id);
      return staleDrafts.filter((d) => !draftIds.includes(d.id));
    }

    return staleDrafts;
  }
}
