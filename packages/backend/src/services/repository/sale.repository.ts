import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { sales, saleItems, type Sale, type NewSale, type SaleItem, type NewSaleItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateSaleInput {
  clientId?: string;
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
        filters?.saleType ? eq(sales.saleType, filters.saleType) : undefined
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
}
