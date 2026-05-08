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

function money(value: string | null | undefined): number {
  return Number.parseFloat(value ?? "0") || 0;
}

function paidAmount(row: {
  paymentMode: string | null;
  amountPaid: string | null;
  totalAmount: string | null;
}): string {
  if (!row.paymentMode && money(row.amountPaid) === 0 && row.totalAmount) {
    return row.totalAmount;
  }

  return row.amountPaid ?? row.totalAmount ?? "0";
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
        amountPaid: cocheraSessions.amountPaid,
        balanceDue: cocheraSessions.balanceDue,
        paymentMode: cocheraSessions.paymentMode,
        paymentMethod: cocheraSessions.paymentMethod,
        responsibleName: cocheraSessions.responsibleName,
        responsiblePhone: cocheraSessions.responsiblePhone,
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
    const totalBilledNum = rows.reduce((sum, r) => sum + money(r.totalAmount), 0);
    const totalIncomeNum = rows.reduce((sum, r) => {
      return sum + money(paidAmount(r));
    }, 0);
    const totalPendingNum = rows.reduce((sum, r) => sum + money(r.balanceDue), 0);
    const averagePerVehicle = totalVehicles > 0 ? totalIncomeNum / totalVehicles : 0;

    const mappedRows: CocheraReportRow[] = rows.map((r) => ({
      id: r.id,
      plate: r.plate,
      vehicleType: r.vehicleType as CocheraReportRow["vehicleType"],
      entryAt: new Date(r.entryAt).toISOString(),
      exitAt: r.exitAt ? new Date(r.exitAt).toISOString() : null,
      durationMinutes: durationMinutes(new Date(r.entryAt), r.exitAt ? new Date(r.exitAt) : null),
      totalAmount: r.totalAmount ?? "0",
      amountPaid: paidAmount(r),
      balanceDue: r.balanceDue ?? "0",
      paymentMode: r.paymentMode as CocheraReportRow["paymentMode"],
      paymentMethod: r.paymentMethod,
      responsibleName: r.responsibleName,
      responsiblePhone: r.responsiblePhone,
      discountAmount: r.discountAmount,
    }));

    return {
      period,
      startDate: formatDateISO(start),
      endDate: formatDateISO(end),
      summary: {
        totalVehicles,
        totalBilled: totalBilledNum.toFixed(2),
        totalIncome: totalIncomeNum.toFixed(2),
        totalPending: totalPendingNum.toFixed(2),
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
      "Total",
      "Cobrado",
      "Saldo pendiente",
      "Estado",
      "Metodo de Pago",
      "Responsable",
      "Descuento",
    ];

    const lines = report.rows.map((r) => {
      const entry = new Date(r.entryAt).toLocaleString("es-PE");
      const exit = r.exitAt ? new Date(r.exitAt).toLocaleString("es-PE") : "";
      const payment = r.paymentMethod ?? "";
      const discount = r.discountAmount ?? "0";
      const status = money(r.balanceDue) <= 0 ? "Cobrado" : money(r.amountPaid) > 0 ? "A cuenta" : "Pendiente";
      return [
        r.plate,
        r.vehicleType,
        entry,
        exit,
        String(r.durationMinutes),
        r.totalAmount,
        r.amountPaid,
        r.balanceDue,
        status,
        payment,
        r.responsibleName ?? "",
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
