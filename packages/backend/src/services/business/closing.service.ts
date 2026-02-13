import type { ClosingRepository } from "../repository/closing.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Closing } from "../../db/schema";

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
    }
  ): Promise<Closing> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para crear cierres");
    }

    if (data.totalSales < 0) {
      throw new ValidationError("El número de ventas no puede ser negativo");
    }

    if (data.totalAmount < 0) {
      throw new ValidationError("El monto total no puede ser negativo");
    }

    const existing = await this.repository.findByDate(
      ctx,
      ctx.businessUserId,
      new Date(data.closingDate)
    );

    if (existing) {
      throw new ValidationError("Ya existe un cierre para esta fecha");
    }

    return this.repository.create(ctx, {
      closingDate: data.closingDate,
      totalSales: data.totalSales,
      totalAmount: data.totalAmount.toString(),
      cashAmount: data.cashAmount.toString(),
      creditAmount: data.creditAmount.toString(),
      totalKilos: data.totalKilos?.toString(),
    });
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
}
