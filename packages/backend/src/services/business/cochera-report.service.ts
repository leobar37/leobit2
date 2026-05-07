import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { cocheraSessions } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import { ForbiddenError } from "../../errors";
import { SubscriptionService } from "./subscription.service";
import {
  getCalendarDayPeriod,
  getCalendarMonthPeriod,
  getCalendarWeekPeriod,
  type CocheraReportPeriod,
  type CocheraReportResult,
  type CocheraReportRow,
} from "@avileo/shared";

function getPeriodDates(period: CocheraReportPeriod): { start: Date; end: Date } {
  const now = new Date();

  if (period === "today") {
    const { periodStart, periodEnd } = getCalendarDayPeriod(now);
    return { start: periodStart, end: periodEnd };
  }

  if (period === "week") {
    const { periodStart, periodEnd } = getCalendarWeekPeriod(now);
    return { start: periodStart, end: periodEnd };
  }

  const { periodStart, periodEnd } = getCalendarMonthPeriod(now);
  return { start: periodStart, end: periodEnd };
}

function formatDateISO(d: Date): string {
  return d.toISOString();
}

function durationMinutes(entryAt: Date, exitAt: Date | null): number {
  if (!exitAt) return 0;
  return Math.max(0, Math.floor((exitAt.getTime() - entryAt.getTime()) / 1000 / 60));
}

export class CocheraReportService {
  constructor(private subscriptionService: SubscriptionService) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError("Esta función solo está disponible para cocheras");
    }
  }

  async getReport(
    ctx: RequestContext,
    period: CocheraReportPeriod
  ): Promise<CocheraReportResult> {
    this.ensureCocheraMode(ctx);

    const { start, end } = getPeriodDates(period);

    const rows = await db
      .select({
        id: cocheraSessions.id,
        plate: cocheraSessions.plate,
        vehicleType: cocheraSessions.vehicleType,
        entryAt: cocheraSessions.entryAt,
        exitAt: cocheraSessions.exitAt,
        totalAmount: cocheraSessions.totalAmount,
        paymentMethod: cocheraSessions.paymentMethod,
        discountAmount: cocheraSessions.discountAmount,
      })
      .from(cocheraSessions)
      .where(
        and(
          eq(cocheraSessions.businessId, ctx.businessId),
          eq(cocheraSessions.status, "fuera"),
          gte(cocheraSessions.checkoutAt, start),
          lte(cocheraSessions.checkoutAt, end)
        )
      )
      .orderBy(desc(cocheraSessions.checkoutAt));

    const totalVehicles = rows.length;
    const totalIncomeNum = rows.reduce((sum, r) => {
      return sum + parseFloat(r.totalAmount ?? "0");
    }, 0);
    const averagePerVehicle = totalVehicles > 0 ? totalIncomeNum / totalVehicles : 0;

    const mappedRows: CocheraReportRow[] = rows.map((r) => ({
      id: r.id,
      plate: r.plate,
      vehicleType: r.vehicleType as CocheraReportRow["vehicleType"],
      entryAt: new Date(r.entryAt).toISOString(),
      exitAt: r.exitAt ? new Date(r.exitAt).toISOString() : null,
      durationMinutes: durationMinutes(new Date(r.entryAt), r.exitAt ? new Date(r.exitAt) : null),
      totalAmount: r.totalAmount ?? "0",
      paymentMethod: r.paymentMethod,
      discountAmount: r.discountAmount,
    }));

    return {
      period,
      startDate: formatDateISO(start),
      endDate: formatDateISO(end),
      summary: {
        totalVehicles,
        totalIncome: totalIncomeNum.toFixed(2),
        averagePerVehicle: averagePerVehicle.toFixed(2),
      },
      rows: mappedRows,
    };
  }

  async exportCSV(
    ctx: RequestContext,
    period: CocheraReportPeriod
  ): Promise<{ csv: string; filename: string }> {
    this.ensureCocheraMode(ctx);

    const limitCheck = await this.subscriptionService.checkLimit(ctx, "export");
    if (!limitCheck.allowed) {
      throw new ForbiddenError(limitCheck.reason || "Exportación no disponible para tu plan.");
    }

    const report = await this.getReport(ctx, period);

    const headers = [
      "Placa",
      "Tipo",
      "Hora Entrada",
      "Hora Salida",
      "Duracion (min)",
      "Monto",
      "Metodo de Pago",
      "Descuento",
    ];

    const lines = report.rows.map((r) => {
      const entry = new Date(r.entryAt).toLocaleString("es-PE");
      const exit = r.exitAt ? new Date(r.exitAt).toLocaleString("es-PE") : "";
      const payment = r.paymentMethod ?? "";
      const discount = r.discountAmount ?? "0";
      return [
        r.plate,
        r.vehicleType,
        entry,
        exit,
        String(r.durationMinutes),
        r.totalAmount,
        payment,
        discount,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...lines].join("\n");
    const filename = `reporte-cochera-${period}-${new Date().toISOString().split("T")[0]}.csv`;

    return { csv, filename };
  }
}
