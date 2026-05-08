import { eq, and, like, desc, sql, gte, lte, gt, or } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  cocheraSessions,
  cocheraSessionPayments,
  type CocheraSession,
  type NewCocheraSession,
  type CocheraSessionPayment,
  type NewCocheraSessionPayment,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import { getCalendarMonthPeriod } from "@avileo/shared";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const paidAmountExpr = sql`
  case
    when ${cocheraSessions.paymentMode} is null
      and coalesce(${cocheraSessions.amountPaid}, 0) = 0
      and ${cocheraSessions.totalAmount} is not null
    then ${cocheraSessions.totalAmount}
    else coalesce(${cocheraSessions.amountPaid}, ${cocheraSessions.totalAmount}, 0)
  end
`;
const totalDebtPaymentsForSessionExpr = sql`
  (
    select coalesce(sum(${cocheraSessionPayments.amount}), 0)
    from ${cocheraSessionPayments}
    where ${cocheraSessionPayments.sessionId} = ${cocheraSessions.id}
      and ${cocheraSessionPayments.businessId} = ${cocheraSessions.businessId}
  )
`;
const checkoutPaidAmountExpr = sql`
  greatest(${paidAmountExpr} - ${totalDebtPaymentsForSessionExpr}, 0)
`;

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

  async listDebts(
    ctx: RequestContext,
    options: {
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<CocheraSession[]> {
    const conditions = [
      eq(cocheraSessions.businessId, ctx.businessId),
      eq(cocheraSessions.status, "fuera"),
      gt(cocheraSessions.balanceDue, "0"),
    ];

    if (options.search?.trim()) {
      const pattern = `%${options.search.trim().toUpperCase()}%`;
      conditions.push(
        or(
          like(cocheraSessions.plate, pattern),
          like(sql`upper(coalesce(${cocheraSessions.responsibleName}, ''))`, pattern),
          like(sql`coalesce(${cocheraSessions.responsiblePhone}, '')`, `%${options.search.trim()}%`)
        )!
      );
    }

    return db.query.cocheraSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(cocheraSessions.checkoutAt)],
      limit: options.limit,
      offset: options.offset,
    });
  }

  async createPayment(
    ctx: RequestContext,
    data: Omit<NewCocheraSessionPayment, "businessId" | "collectedBy">,
    tx?: DbTransaction
  ): Promise<CocheraSessionPayment> {
    const executor = tx ?? db;
    const [payment] = await executor
      .insert(cocheraSessionPayments)
      .values({
        ...data,
        businessId: ctx.businessId,
        collectedBy: ctx.businessUserId,
      })
      .returning();

    return payment;
  }

  async listPaymentsBySession(
    ctx: RequestContext,
    sessionId: string,
    tx?: DbTransaction
  ): Promise<CocheraSessionPayment[]> {
    const executor = tx ?? db;
    return executor.query.cocheraSessionPayments.findMany({
      where: and(
        eq(cocheraSessionPayments.businessId, ctx.businessId),
        eq(cocheraSessionPayments.sessionId, sessionId)
      ),
      orderBy: [desc(cocheraSessionPayments.createdAt)],
    });
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

    const checkoutResult = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${checkoutPaidAmountExpr}), 0)`,
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

    const paymentResult = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${cocheraSessionPayments.amount}), 0)`,
      })
      .from(cocheraSessionPayments)
      .where(
        and(
          eq(cocheraSessionPayments.businessId, ctx.businessId),
          gte(cocheraSessionPayments.createdAt, todayStart),
          lte(cocheraSessionPayments.createdAt, todayEnd)
        )
      );

    return String(
      (Number(checkoutResult[0]?.total ?? 0) || 0) +
      (Number(paymentResult[0]?.total ?? 0) || 0)
    );
  }

  async sumIncomeThisMonth(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<string> {
    const dbOrTx = tx || db;
    const now = new Date();
    const { periodStart, periodEnd } = getCalendarMonthPeriod(now);

    const checkoutResult = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${checkoutPaidAmountExpr}), 0)`,
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

    const paymentResult = await dbOrTx
      .select({
        total: sql<string>`coalesce(sum(${cocheraSessionPayments.amount}), 0)`,
      })
      .from(cocheraSessionPayments)
      .where(
        and(
          eq(cocheraSessionPayments.businessId, ctx.businessId),
          gte(cocheraSessionPayments.createdAt, periodStart),
          lte(cocheraSessionPayments.createdAt, periodEnd)
        )
      );

    return String(
      (Number(checkoutResult[0]?.total ?? 0) || 0) +
      (Number(paymentResult[0]?.total ?? 0) || 0)
    );
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

    const checkoutRows = await dbOrTx
      .select({
        date: sql<string>`to_char(date(${cocheraSessions.checkoutAt}), 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(${checkoutPaidAmountExpr}), 0)`,
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

    const paymentRows = await dbOrTx
      .select({
        date: sql<string>`to_char(date(${cocheraSessionPayments.createdAt}), 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(${cocheraSessionPayments.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(cocheraSessionPayments)
      .where(
        and(
          eq(cocheraSessionPayments.businessId, ctx.businessId),
          gte(cocheraSessionPayments.createdAt, sevenDaysAgo),
          lte(cocheraSessionPayments.createdAt, now)
        )
      )
      .groupBy(sql`date(${cocheraSessionPayments.createdAt})`)
      .orderBy(sql`date(${cocheraSessionPayments.createdAt})`);

    // Fill missing days with zeros
    const result: { date: string; income: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const checkout = checkoutRows.find((r) => r.date === dateStr);
      const payment = paymentRows.find((r) => r.date === dateStr);
      result.push({
        date: dateStr,
        income: String(
          (Number(checkout?.income ?? 0) || 0) +
          (Number(payment?.income ?? 0) || 0)
        ),
        count: (checkout?.count ?? 0) + (payment?.count ?? 0),
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
