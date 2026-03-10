import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { sales, saleItems, type Sale, type NewSale, type SaleItem, type NewSaleItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface UpdateSaleInput {
  status?: "draft" | "confirmed" | "active" | "delivered" | "cancelled";
  deliveryDate?: string;
  confirmedSnapshot?: Record<string, unknown>;
  deliveredSnapshot?: Record<string, unknown>;
  paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
  advanceAmount?: string;
  advancePaymentMethod?: string;
  advanceReferenceNumber?: string;
  advanceProofImageId?: string;
  totalAmount?: string;
  amountPaid?: string;
  balanceDue?: string;
  allowCustomerEdit?: boolean;
}

export interface CreateSaleInput {
  clientId?: string;
  orderId?: string;
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara?: string;
  netWeight?: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: string;
    unitPrice: string;
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
      status?: "draft" | "active" | "cancelled";
      limit?: number;
      offset?: number;
    }
  ): Promise<Sale[]> {
    return db.query.sales.findMany({
      where: and(
        eq(sales.businessId, ctx.businessId),
        eq(sales.sellerId, ctx.businessUserId),
        filters?.startDate ? gte(sales.saleDate, filters.startDate) : undefined,
        filters?.endDate ? lte(sales.saleDate, filters.endDate) : undefined,
        filters?.saleType ? eq(sales.saleType, filters.saleType) : undefined,
        filters?.status ? eq(sales.status, filters.status) : undefined
      ),
      orderBy: desc(sales.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
      with: {
        items: true,
        client: true,
      },
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Sale | undefined> {
    return db.query.sales.findFirst({
      where: and(
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId)
      ),
      with: {
        items: true,
        client: true,
      },
    });
  }

  async findByOrderId(ctx: RequestContext, orderId: string): Promise<Sale | undefined> {
    return db.query.sales.findFirst({
      where: and(eq(sales.orderId, orderId), eq(sales.businessId, ctx.businessId)),
      with: {
        items: true,
        client: true,
      },
    });
  }

  async create(ctx: RequestContext, data: CreateSaleInput, tx?: DbTransaction): Promise<Sale> {
    const { items, ...saleData } = data;

    const executor = tx ?? db;

    const [sale] = await executor
      .insert(sales)
      .values({
        ...saleData,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
      })
      .returning();

    if (items && items.length > 0) {
      await executor.insert(saleItems).values(
        items.map((item) => ({
          ...item,
          saleId: sale.id,
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
    data: Partial<Pick<Sale, "status" | "cancelledAt" | "cancelledBy" | "cancelReason" | "refundAmount" | "refundDate" | "refundMethod" | "refundReference" | "refundNotes">>,
    tx?: DbTransaction
  ): Promise<Sale> {
    const executor = tx ?? db;

    const [sale] = await executor
      .update(sales)
      .set(data)
      .where(and(
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId)
      ))
      .returning();

    return sale;
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
      .select({ total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')` })
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
    return executor
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));
  }

  async findItemById(ctx: RequestContext, saleId: string, itemId: string): Promise<SaleItem | undefined> {
    return db.query.saleItems.findFirst({
      where: and(
        eq(saleItems.id, itemId),
        eq(saleItems.saleId, saleId)
      ),
    });
  }

  async updateItem(
    ctx: RequestContext,
    saleId: string,
    itemId: string,
    data: Partial<Pick<SaleItem, "deliveredQuantity" | "unitPriceFinal" | "isModified" | "originalQuantity" | "orderedQuantity">>,
    tx?: DbTransaction
  ): Promise<SaleItem | undefined> {
    const executor = tx ?? db;
    const [item] = await executor
      .update(saleItems)
      .set(data)
      .where(and(
        eq(saleItems.id, itemId),
        eq(saleItems.saleId, saleId)
      ))
      .returning();
    return item;
  }

  async updateVersion(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    data: UpdateSaleInput,
    tx?: DbTransaction
  ): Promise<Sale | undefined> {
    const executor = tx ?? db;
    const [sale] = await executor
      .update(sales)
      .set({
        ...data,
        version: baseVersion + 1,
      })
      .where(and(
        eq(sales.id, id),
        eq(sales.businessId, ctx.businessId),
        eq(sales.version, baseVersion)
      ))
      .returning();
    return sale;
  }

  async replaceItems(
    ctx: RequestContext,
    saleId: string,
    items: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      quantity: string;
      unitPrice: string;
      subtotal: string;
    }>,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;
    // Delete existing items
    await executor.delete(saleItems).where(eq(saleItems.saleId, saleId));
    // Insert new items
    if (items.length > 0) {
      await executor.insert(saleItems).values(
        items.map((item) => ({
          ...item,
          saleId,
        }))
      );
    }
  }
}
