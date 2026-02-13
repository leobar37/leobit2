import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { closings, type Closing, type NewClosing } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class ClosingRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      sellerId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Closing[]> {
    return db.query.closings.findMany({
      where: and(
        eq(closings.businessId, ctx.businessId),
        filters?.sellerId ? eq(closings.sellerId, filters.sellerId) : undefined
      ),
      orderBy: desc(closings.closingDate),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Closing | undefined> {
    return db.query.closings.findFirst({
      where: and(
        eq(closings.id, id),
        eq(closings.businessId, ctx.businessId)
      ),
    });
  }

  async findByDate(
    ctx: RequestContext,
    sellerId: string,
    date: Date
  ): Promise<Closing | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    return db.query.closings.findFirst({
      where: and(
        eq(closings.businessId, ctx.businessId),
        eq(closings.sellerId, sellerId),
        eq(closings.closingDate, dateStr)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewClosing, "businessId" | "sellerId" | "id" | "createdAt">
  ): Promise<Closing> {
    const [closing] = await db
      .insert(closings)
      .values({
        ...data,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
      })
      .returning();

    return closing;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewClosing, "businessId" | "sellerId" | "id" | "createdAt">>
  ): Promise<Closing | undefined> {
    const [closing] = await db
      .update(closings)
      .set(data)
      .where(and(
        eq(closings.id, id),
        eq(closings.businessId, ctx.businessId)
      ))
      .returning();

    return closing;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(closings)
      .where(and(
        eq(closings.id, id),
        eq(closings.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext, filters?: { sellerId?: string }): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(closings)
      .where(and(
        eq(closings.businessId, ctx.businessId),
        filters?.sellerId ? eq(closings.sellerId, filters.sellerId) : undefined
      ));

    return result[0]?.count ?? 0;
  }

  async getTodayStats(ctx: RequestContext, sellerId: string): Promise<{
    totalSales: number;
    totalAmount: number;
    cashAmount: number;
    creditAmount: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const result = await db
      .select({
        totalSales: sql<number>`coalesce(sum(${closings.totalSales}), 0)`,
        totalAmount: sql<number>`coalesce(sum(${closings.totalAmount}), 0)`,
        cashAmount: sql<number>`coalesce(sum(${closings.cashAmount}), 0)`,
        creditAmount: sql<number>`coalesce(sum(${closings.creditAmount}), 0)`,
      })
      .from(closings)
      .where(and(
        eq(closings.businessId, ctx.businessId),
        eq(closings.sellerId, sellerId),
        eq(closings.closingDate, today)
      ));

    return {
      totalSales: result[0]?.totalSales ?? 0,
      totalAmount: result[0]?.totalAmount ?? 0,
      cashAmount: result[0]?.cashAmount ?? 0,
      creditAmount: result[0]?.creditAmount ?? 0,
    };
  }
}
