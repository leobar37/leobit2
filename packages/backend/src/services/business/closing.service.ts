import type { ClosingRepository } from "../repository/closing.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "../../errors";
import type { Closing } from "../../db/schema";
import { getToday, parseDateString } from "../../lib/date-utils";
import { normalizeAmount, normalizeQuantity, validateNonNegative } from "../../lib/number-utils";

const MAX_BACKDATE_DAYS = 7;

export class ClosingService {
  constructor(private repository: ClosingRepository) {}

  async getClosings(
    ctx: RequestContext,
    filters?: {
      sellerId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver cierres");
    }

    return this.repository.findMany(ctx, filters);
  }

  async getClosing(ctx: RequestContext, id: string): Promise<Closing> {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver cierres");
    }

    const closing = await this.repository.findById(ctx, id);
    if (!closing) {
      throw new NotFoundError("Cierre");
    }

    return closing;
  }

  async createClosing(
    ctx: RequestContext,
    data: {
      closingDate: string;
      totalSales: number;
      totalAmount: number;
      cashAmount: number;
      creditAmount: number;
      totalKilos?: number;
      backdateReason?: string;
    }
  ): Promise<Closing> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para crear cierres");
    }

    if (!Number.isInteger(data.totalSales) || data.totalSales < 0) {
      throw new ValidationError("El número de ventas no puede ser negativo");
    }

    validateNonNegative(data.totalAmount, "El monto total");
    validateNonNegative(data.cashAmount, "El monto al contado");
    validateNonNegative(data.creditAmount, "El monto a crédito");
    if (data.totalKilos !== undefined) {
      validateNonNegative(data.totalKilos, "Los kilos totales");
    }

    const normalizedDate = this.normalizeClosingDate(data.closingDate);
    const today = parseDateString(getToday());
    const closingDate = parseDateString(normalizedDate);

    if (closingDate.getTime() > today.getTime()) {
      throw new ValidationError("No se puede generar cierre para fechas futuras");
    }

    const diffInDays = Math.floor((today.getTime() - closingDate.getTime()) / 86400000);
    const isBackdated = diffInDays > 0;
    const backdateReason = data.backdateReason?.trim();

    if (isBackdated) {
      if (!ctx.isAdmin()) {
        throw new ForbiddenError("Solo administradores pueden registrar cierres en fechas pasadas");
      }

      if (diffInDays > MAX_BACKDATE_DAYS) {
        throw new ValidationError(
          `Solo se permite registrar cierres hasta ${MAX_BACKDATE_DAYS} días hacia atrás`
        );
      }

      if (!backdateReason || backdateReason.length < 10) {
        throw new ValidationError("Debe indicar un motivo de al menos 10 caracteres para cierres retroactivos");
      }
    }

    const existing = await this.repository.findByDate(
      ctx,
      ctx.businessUserId,
      normalizedDate
    );

    if (existing) {
      throw new ValidationError("Ya existe un cierre para esta fecha");
    }

    try {
      return await this.repository.create(ctx, {
        closingDate: normalizedDate,
        totalSales: data.totalSales,
        totalAmount: normalizeAmount(data.totalAmount, 2, "El monto total"),
        cashAmount: normalizeAmount(data.cashAmount, 2, "El monto al contado"),
        creditAmount: normalizeAmount(data.creditAmount, 2, "El monto a crédito"),
        totalKilos:
          data.totalKilos !== undefined
            ? normalizeQuantity(data.totalKilos, "Los kilos totales")
            : undefined,
        backdateReason: isBackdated ? backdateReason : undefined,
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictError("Ya existe un cierre para esta fecha");
      }

      throw error;
    }
  }

  async updateClosing(
    ctx: RequestContext,
    id: string,
    data: Partial<{
      totalSales: number;
      totalAmount: number;
      cashAmount: number;
      creditAmount: number;
      totalKilos?: number;
    }>
  ): Promise<Closing> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar cierres");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Cierre");
    }

    const updateData: Parameters<ClosingRepository["update"]>[2] = {};

    if (data.totalSales !== undefined) {
      updateData.totalSales = data.totalSales;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = data.totalAmount.toString();
    }
    if (data.cashAmount !== undefined) {
      updateData.cashAmount = data.cashAmount.toString();
    }
    if (data.creditAmount !== undefined) {
      updateData.creditAmount = data.creditAmount.toString();
    }
    if (data.totalKilos !== undefined) {
      updateData.totalKilos = data.totalKilos.toString();
    }

    const updated = await this.repository.update(ctx, id, updateData);
    if (!updated) {
      throw new NotFoundError("Cierre");
    }

    return updated;
  }

  async deleteClosing(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar cierres");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Cierre");
    }

    await this.repository.delete(ctx, id);
  }

  async getTodayStats(ctx: RequestContext): Promise<{
    totalSales: number;
    totalAmount: number;
    cashAmount: number;
    creditAmount: number;
  }> {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver estadísticas");
    }

    return this.repository.getTodayStats(ctx, ctx.businessUserId);
  }

  private normalizeClosingDate(closingDate: string): string {
    const match = closingDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new ValidationError("Formato de fecha inválido. Use YYYY-MM-DD");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new ValidationError("Fecha inválida");
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }

    return "code" in error && (error as { code?: string }).code === "23505";
  }
}
