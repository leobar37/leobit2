import { eq, and, like, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  cocheraSessions,
  type CocheraSession,
  type NewCocheraSession,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import { getCalendarMonthPeriod } from "@avileo/shared";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class CocheraSessionRepository {
  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<CocheraSession | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.cocheraSessions.findFirst({
      where: and(
        eq(cocheraSessions.id, id),
        eq(cocheraSessions.businessId, ctx.businessId)
      ),
    });
  }

  async findActiveByPlate(
    ctx: RequestContext,
    plate: string,
    tx?: DbTransaction
  ): Promise<CocheraSession | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.cocheraSessions.findFirst({
      where: and(
        eq(cocheraSessions.businessId, ctx.businessId),
        eq(cocheraSessions.plate, plate),
        eq(cocheraSessions.status, "dentro")
      ),
    });
  }

  async listActive(
    ctx: RequestContext,
    options: {
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
    tx?: DbTransaction
  ): Promise<CocheraSession[]> {
    const dbOrTx = tx || db;
    const conditions = [
      eq(cocheraSessions.businessId, ctx.businessId),
      eq(cocheraSessions.status, "dentro"),
    ];

    if (options.search) {
      conditions.push(
        like(cocheraSessions.plate, `%${options.search.toUpperCase()}%`)
      );
    }

    return dbOrTx.query.cocheraSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(cocheraSessions.entryAt)],
      limit: options.limit,
      offset: options.offset,
    });
  }

  async countActive(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<number> {
    const dbOrTx = tx || db;
    const result = await dbOrTx
      .select({ count: sql<number>`count(*)` })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "dentro")
        )
      );

    return result[0]?.count ?? 0;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewCocheraSession, "businessId">,
    tx?: DbTransaction
  ): Promise<CocheraSession> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(cocheraSessions)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return result;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<NewCocheraSession>,
    tx?: DbTransaction
  ): Promise<CocheraSession> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(cocheraSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cocheraSessions.id, id),
          eq(cocheraSessions.businessId, ctx.businessId)
        )
      )
      .returning();

    return result;
  }

  async countCompletedThisMonth(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<number> {
    const dbOrTx = tx || db;
    const now = new Date();
    const { periodStart, periodEnd } = getCalendarMonthPeriod(now);

    const result = await dbOrTx
      .select({ count: sql<number>`count(*)` })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "fuera"),
          sql`${cocheraSessions.checkoutAt} >= ${periodStart}`,
          sql`${cocheraSessions.checkoutAt} <= ${periodEnd}`
        )
      );

    return result[0]?.count ?? 0;
  }

  // --- Dashboard aggregates ---

  async countEntriesToday(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<number> {
    const dbOrTx = tx || db;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await dbOrTx
      .select({ count: sql<number>`count(*)` })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          gte(cocheraSessions.entryAt, todayStart),
          lte(cocheraSessions.entryAt, todayEnd)
        )
      );

    return result[0]?.count ?? 0;
  }

  async sumIncomeToday(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<string> {
    const dbOrTx = tx || db;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${cocheraSessions.totalAmount}), 0)`,
      })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "fuera"),
          gte(cocheraSessions.checkoutAt, todayStart),
          lte(cocheraSessions.checkoutAt, todayEnd)
        )
      );

    return result[0]?.total ?? "0";
  }

  async sumIncomeThisMonth(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<string> {
    const dbOrTx = tx || db;
    const now = new Date();
    const { periodStart, periodEnd } = getCalendarMonthPeriod(now);

    const result = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${cocheraSessions.totalAmount}), 0)`,
      })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "fuera"),
          gte(cocheraSessions.checkoutAt, periodStart),
          lte(cocheraSessions.checkoutAt, periodEnd)
        )
      );

    return result[0]?.total ?? "0";
  }

  async getDailyIncomeLast7Days(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<{ date: string; income: string; count: number }[]> {
    const dbOrTx = tx || db;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await dbOrTx
      .select({
        date: sql<string>`to_char(date(${cocheraSessions.checkoutAt}), 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(${cocheraSessions.totalAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "fuera"),
          gte(cocheraSessions.checkoutAt, sevenDaysAgo),
          lte(cocheraSessions.checkoutAt, now)
        )
      )
      .groupBy(sql`date(${cocheraSessions.checkoutAt})`)
      .orderBy(sql`date(${cocheraSessions.checkoutAt})`);

    // Fill missing days with zeros
    const result: { date: string; income: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = rows.find((r) => r.date === dateStr);
      result.push({
        date: dateStr,
        income: found?.income ?? "0",
        count: found?.count ?? 0,
      });
    }

    return result;
  }

  async getRecentActivity(
    ctx: RequestContext,
    tx?: DbTransaction,
    limit: number = 5
  ): Promise<CocheraSession[]> {
    const dbOrTx = tx || db;
    return dbOrTx.query.cocheraSessions.findMany({
      where: and(
        eq(cocheraSessions.businessId, ctx.businessId),
        eq(cocheraSessions.status, "fuera")
      ),
      orderBy: [desc(cocheraSessions.checkoutAt)],
      limit,
    });
  }
}
