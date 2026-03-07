import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { sales, customers, abonos } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface SalesTodayStats {
  today: {
    amount: number;
    kilos: number;
    count: number;
  };
  yesterday: {
    amount: number;
    kilos: number;
    count: number;
  };
  change: {
    amount: number;
    kilos: number;
    count: number;
  };
}

export interface DebtorsSummary {
  totalDebt: number;
  debtorsCount: number;
}

export interface WeeklySalesData {
  labels: string[];
  data: number[];
}

export class ReportService {
  async getSalesTodayStats(ctx: RequestContext): Promise<SalesTodayStats> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's stats
    const todayStats = await db
      .select({
        totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
        totalKilos: sql<string>`coalesce(sum(${sales.netWeight}), '0')`,
        count: sql<number>`count(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, ctx.businessId),
          eq(sales.sellerId, ctx.businessUserId),
          gte(sales.saleDate, today),
          lte(sales.saleDate, tomorrow)
        )
      );

    // Get yesterday's stats
    const yesterdayStats = await db
      .select({
        totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
        totalKilos: sql<string>`coalesce(sum(${sales.netWeight}), '0')`,
        count: sql<number>`count(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, ctx.businessId),
          eq(sales.sellerId, ctx.businessUserId),
          gte(sales.saleDate, yesterday),
          lte(sales.saleDate, today)
        )
      );

    const todayAmount = parseFloat(todayStats[0]?.totalAmount ?? "0");
    const todayKilos = parseFloat(todayStats[0]?.totalKilos ?? "0");
    const todayCount = todayStats[0]?.count ?? 0;

    const yesterdayAmount = parseFloat(yesterdayStats[0]?.totalAmount ?? "0");
    const yesterdayKilos = parseFloat(yesterdayStats[0]?.totalKilos ?? "0");
    const yesterdayCount = yesterdayStats[0]?.count ?? 0;

    // Calculate percentage change
    const amountChange = yesterdayAmount > 0
      ? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100
      : 0;
    const kilosChange = yesterdayKilos > 0
      ? ((todayKilos - yesterdayKilos) / yesterdayKilos) * 100
      : 0;
    const countChange = yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : 0;

    return {
      today: {
        amount: todayAmount,
        kilos: todayKilos,
        count: todayCount,
      },
      yesterday: {
        amount: yesterdayAmount,
        kilos: yesterdayKilos,
        count: yesterdayCount,
      },
      change: {
        amount: Math.round(amountChange * 10) / 10,
        kilos: Math.round(kilosChange * 10) / 10,
        count: Math.round(countChange * 10) / 10,
      },
    };
  }

  async getDebtorsSummary(ctx: RequestContext): Promise<DebtorsSummary> {
    // Get total credit sales per customer
    const creditSalesByCustomer = await db
      .select({
        clientId: sales.clientId,
        totalCredit: sql<string>`sum(${sales.totalAmount})`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, ctx.businessId),
          eq(sales.saleType, "credito"),
          sql`${sales.clientId} is not null`
        )
      )
      .groupBy(sales.clientId);

    // Get total payments per customer
    const paymentsByCustomer = await db
      .select({
        clientId: abonos.clientId,
        totalPayments: sql<string>`sum(${abonos.amount})`,
      })
      .from(abonos)
      .where(eq(abonos.businessId, ctx.businessId))
      .groupBy(abonos.clientId);

    // Calculate debt per customer
    const customerDebts = creditSalesByCustomer.map((cs) => {
      const payments = paymentsByCustomer.find(
        (p) => p.clientId === cs.clientId
      );
      const credit = parseFloat(cs.totalCredit ?? "0");
      const paid = parseFloat(payments?.totalPayments ?? "0");
      return Math.max(credit - paid, 0);
    });

    const totalDebt = customerDebts.reduce((sum, debt) => sum + debt, 0);
    const debtorsCount = customerDebts.filter((debt) => debt > 0).length;

    return {
      totalDebt,
      debtorsCount,
    };
  }

  async getWeeklySales(ctx: RequestContext): Promise<WeeklySalesData> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get last 7 days
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    const data: number[] = [];

    for (const day of days) {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySales = await db
        .select({
          total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.businessId, ctx.businessId),
            eq(sales.sellerId, ctx.businessUserId),
            gte(sales.saleDate, day),
            lte(sales.saleDate, nextDay)
          )
        );

      data.push(parseFloat(daySales[0]?.total ?? "0"));
    }

    return {
      labels,
      data,
    };
  }
}
