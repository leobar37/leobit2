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

export interface ChartData {
  labels: string[];
  data: number[];
}

export type PeriodType = "day" | "week" | "month" | "range";

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
        customerId: sales.customerId,
        totalCredit: sql<string>`sum(${sales.totalAmount})`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, ctx.businessId),
          eq(sales.saleType, "credito"),
          sql`${sales.customerId} is not null`
        )
      )
      .groupBy(sales.customerId);

    // Get total payments per customer
    const paymentsByCustomer = await db
      .select({
        customerId: abonos.customerId,
        totalPayments: sql<string>`sum(${abonos.amount})`,
      })
      .from(abonos)
      .where(eq(abonos.businessId, ctx.businessId))
      .groupBy(abonos.customerId);

    // Calculate debt per customer
    const customerDebts = creditSalesByCustomer.map((cs) => {
      const payments = paymentsByCustomer.find(
        (p) => p.customerId === cs.customerId
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

  async getSalesStats(
    ctx: RequestContext,
    options: {
      type: PeriodType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SalesStats> {
    const { type, startDate, endDate } = options;
    const { currentRange, previousRange } = this.getDateRanges(type, startDate, endDate);

    const currentStats = await this.getSalesRangeStats(ctx, currentRange.start, currentRange.end);
    const previousStats = await this.getSalesRangeStats(ctx, previousRange.start, previousRange.end);

    const currentAmount = parseFloat(currentStats[0]?.totalAmount ?? "0");
    const currentKilos = parseFloat(currentStats[0]?.totalKilos ?? "0");
    const currentCount = currentStats[0]?.count ?? 0;

    const previousAmount = parseFloat(previousStats[0]?.totalAmount ?? "0");
    const previousKilos = parseFloat(previousStats[0]?.totalKilos ?? "0");
    const previousCount = previousStats[0]?.count ?? 0;

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

  async getSalesChart(
    ctx: RequestContext,
    options: {
      type: PeriodType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ChartData> {
    const { type, startDate, endDate } = options;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let labels: string[] = [];
    const data: number[] = [];

    if (type === "day") {
      for (let i = 0; i < 24; i++) {
        const hour = new Date(today);
        hour.setUTCHours(i, 0, 0, 0);
        const nextHour = new Date(hour);
        nextHour.setUTCHours(i + 1, 0, 0, 0);

        const hourSales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, hour),
              lte(sales.saleDate, nextHour)
            )
          );

        labels.push(`${i}:00`);
        data.push(parseFloat(hourSales[0]?.total ?? "0"));
      }
    } else if (type === "week") {
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const dayOfWeek = today.getUTCDay();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const daySales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, date),
              lte(sales.saleDate, nextDate)
            )
          );

        labels.push(days[(dayOfWeek - i + 7) % 7]);
        data.push(parseFloat(daySales[0]?.total ?? "0"));
      }
    } else if (type === "month") {
      const currentDay = today.getUTCDate();
      const daysInMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 0).getUTCDate();
      const step = Math.max(1, Math.floor(daysInMonth / 7));

      for (let i = 0; i < daysInMonth; i += step) {
        const start = new Date(today);
        start.setUTCDate(i + 1);
        const end = new Date(today);
        end.setUTCDate(Math.min(i + step + 1, daysInMonth + 1));

        const periodSales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, start),
              lte(sales.saleDate, end)
            )
          );

        labels.push(`${i + 1}`);
        data.push(parseFloat(periodSales[0]?.total ?? "0"));
      }
    } else if (type === "range" && startDate && endDate) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const step = Math.max(1, Math.ceil(daysDiff / 7));

      for (let i = 0; i < daysDiff; i += step) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + i);
        const end = new Date(startDate);
        end.setDate(end.getDate() + Math.min(i + step, daysDiff));

        const periodSales = await db
          .select({
            total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.businessId, ctx.businessId),
              eq(sales.sellerId, ctx.businessUserId),
              gte(sales.saleDate, start),
              lte(sales.saleDate, end)
            )
          );

        labels.push(start.toLocaleDateString("es-PE", { day: "numeric", month: "short" }));
        data.push(parseFloat(periodSales[0]?.total ?? "0"));
      }
    }

    return { labels, data };
  }

  private async getSalesRangeStats(
    ctx: RequestContext,
    start: Date,
    end: Date
  ) {
    return db
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
          gte(sales.saleDate, start),
          lte(sales.saleDate, end)
        )
      );
  }

  private getDateRanges(
    type: PeriodType,
    startDate?: Date,
    endDate?: Date
  ): {
    currentRange: { start: Date; end: Date };
    previousRange: { start: Date; end: Date };
  } {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (type === "day") {
      return {
        currentRange: { start: today, end: tomorrow },
        previousRange: {
          start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          end: today,
        },
      };
    }

    if (type === "week") {
      const dayOfWeek = today.getUTCDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      startOfWeek.setUTCHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const prevStart = new Date(startOfWeek);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = startOfWeek;

      return {
        currentRange: { start: startOfWeek, end: endOfWeek },
        previousRange: { start: prevStart, end: prevEnd },
      };
    }

    if (type === "month") {
      const startOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
      const endOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);

      const prevStart = new Date(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
      const prevEnd = startOfMonth;

      return {
        currentRange: { start: startOfMonth, end: endOfMonth },
        previousRange: { start: prevStart, end: prevEnd },
      };
    }

    if (type === "range" && startDate && endDate) {
      const rangeDuration = endDate.getTime() - startDate.getTime();
      const prevStart = new Date(startDate.getTime() - rangeDuration);
      const prevEnd = startDate;

      return {
        currentRange: { start: startDate, end: endDate },
        previousRange: { start: prevStart, end: prevEnd },
      };
    }

    return {
      currentRange: { start: today, end: tomorrow },
      previousRange: {
        start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        end: today,
      },
    };
  }
}
