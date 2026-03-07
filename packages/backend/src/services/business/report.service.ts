import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { sales, customers, abonos } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export type PeriodType = "day" | "week" | "month" | "range";

export interface SalesStats {
  current: {
    amount: number;
    kilos: number;
    count: number;
  };
  previous: {
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

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface PeriodParams {
  type: PeriodType;
  startDate?: Date;
  endDate?: Date;
}

export class ReportService {
  private getPeriodDates(params: PeriodParams): { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date } {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (params.type === "range" && params.startDate && params.endDate) {
      // Custom range
      currentStart = new Date(params.startDate);
      currentEnd = new Date(params.endDate);
      currentEnd.setUTCHours(23, 59, 59, 999);

      // Previous period of same duration
      const duration = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - duration);
    } else if (params.type === "week") {
      // Current week (Monday to today)
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - diffToMonday);
      currentEnd = new Date(now);
      currentEnd.setUTCHours(23, 59, 59, 999);

      // Previous week
      previousStart = new Date(currentStart);
      previousStart.setDate(currentStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousEnd.setDate(currentStart.getDate() - 1);
      previousEnd.setUTCHours(23, 59, 59, 999);
    } else if (params.type === "month") {
      // Current month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now);
      currentEnd.setUTCHours(23, 59, 59, 999);

      // Previous month
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      previousEnd.setUTCHours(23, 59, 59, 999);
    } else {
      // Day (default)
      currentStart = new Date(now);
      currentEnd = new Date(now);
      currentEnd.setUTCHours(23, 59, 59, 999);

      previousStart = new Date(now);
      previousStart.setDate(now.getDate() - 1);
      previousEnd = new Date(previousStart);
      previousEnd.setUTCHours(23, 59, 59, 999);
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  async getSalesStats(ctx: RequestContext, params: PeriodParams): Promise<SalesStats> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.getPeriodDates(params);

    // Get current period stats
    const currentStats = await db
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
          gte(sales.saleDate, currentStart),
          lte(sales.saleDate, currentEnd)
        )
      );

    // Get previous period stats
    const previousStats = await db
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
          gte(sales.saleDate, previousStart),
          lte(sales.saleDate, previousEnd)
        )
      );

    const currentAmount = parseFloat(currentStats[0]?.totalAmount ?? "0");
    const currentKilos = parseFloat(currentStats[0]?.totalKilos ?? "0");
    const currentCount = currentStats[0]?.count ?? 0;

    const previousAmount = parseFloat(previousStats[0]?.totalAmount ?? "0");
    const previousKilos = parseFloat(previousStats[0]?.totalKilos ?? "0");
    const previousCount = previousStats[0]?.count ?? 0;

    // Calculate percentage change
    const amountChange = previousAmount > 0
      ? ((currentAmount - previousAmount) / previousAmount) * 100
      : 0;
    const kilosChange = previousKilos > 0
      ? ((currentKilos - previousKilos) / previousKilos) * 100
      : 0;
    const countChange = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

    return {
      current: {
        amount: currentAmount,
        kilos: currentKilos,
        count: currentCount,
      },
      previous: {
        amount: previousAmount,
        kilos: previousKilos,
        count: previousCount,
      },
      change: {
        amount: Math.round(amountChange * 10) / 10,
        kilos: Math.round(kilosChange * 10) / 10,
        count: Math.round(countChange * 10) / 10,
      },
    };
  }

  // Legacy method for backward compatibility
  async getSalesTodayStats(ctx: RequestContext): Promise<SalesStats> {
    return this.getSalesStats(ctx, { type: "day" });
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

  async getWeeklySales(ctx: RequestContext): Promise<ChartData> {
    return this.getSalesChart(ctx, { type: "week" });
  }

  async getSalesChart(ctx: RequestContext, params: PeriodParams): Promise<ChartData> {
    const { currentStart, currentEnd } = this.getPeriodDates(params);

    // Calculate number of data points based on period type
    let labels: string[] = [];
    let dataPoints: number[] = [];

    if (params.type === "day") {
      // Hourly breakdown for day view
      labels = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];
      const hours = [6, 9, 12, 15, 18, 21];

      for (let i = 0; i < hours.length; i++) {
        const startHour = new Date(currentStart);
        startHour.setHours(hours[i], 0, 0, 0);
        const endHour = new Date(startHour);
        endHour.setHours(hours[i] + 3, 0, 0, 0);

        const hourSales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, startHour),
              lte(sales.saleDate, endHour)
            )
          );

        dataPoints.push(parseFloat(hourSales[0]?.total ?? "0"));
      }
    } else if (params.type === "week" || params.type === "range") {
      // Daily breakdown
      const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
      const days: Date[] = [];
      const current = new Date(currentStart);

      while (current <= currentEnd) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Limit to max 14 days for readability
      const limitedDays = days.slice(-14);

      for (const day of limitedDays) {
        labels.push(dayNames[day.getDay()]);
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

        dataPoints.push(parseFloat(daySales[0]?.total ?? "0"));
      }
    } else if (params.type === "month") {
      // Weekly breakdown for month view
      labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(currentStart);
        weekStart.setDate(weekStart.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekSales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, weekStart),
              lte(sales.saleDate, weekEnd)
            )
          );

        dataPoints.push(parseFloat(weekSales[0]?.total ?? "0"));
      }
    }

    return {
      labels,
      data: dataPoints,
    };
  }
}
