import type { PaymentRepository } from "../repository/payment.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Abono } from "../../db/schema";

export class PaymentService {
  constructor(private repository: PaymentRepository) {}

  async getPayments(
    ctx: RequestContext,
    filters?: {
      clientId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver abonos");
    }

    return this.repository.findMany(ctx, filters);
  }

  async getPayment(ctx: RequestContext, id: string): Promise<Abono> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver abonos");
    }

    const abono = await this.repository.findById(ctx, id);
    if (!abono) {
      throw new NotFoundError("Abono");
    }

    return abono;
  }

  async createPayment(
    ctx: RequestContext,
    data: {
      clientId: string;
      amount: number;
      paymentMethod: "efectivo" | "yape" | "plin" | "transferencia";
      notes?: string;
    }
  ): Promise<Abono> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para registrar abonos");
    }

    if (data.amount <= 0) {
      throw new ValidationError("El monto debe ser mayor a 0");
    }

    return this.repository.create(ctx, {
      clientId: data.clientId,
      amount: data.amount.toString(),
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
  }

  async deletePayment(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar abonos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Abono");
    }

    await this.repository.delete(ctx, id);
  }

  async getTotalPaymentsByClient(ctx: RequestContext, clientId: string): Promise<number> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver abonos");
    }

    return this.repository.getTotalByClient(ctx, clientId);
  }

  async updatePaymentProof(
    ctx: RequestContext,
    id: string,
    data: {
      proofImageId?: string;
      referenceNumber?: string;
    }
  ): Promise<Abono> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar abonos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Abono");
    }

    return this.repository.update(ctx, id, data);
  }
}
