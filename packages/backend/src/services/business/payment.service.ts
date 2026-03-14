import type { PaymentRepository } from "../repository/payment.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Abono } from "../../db/schema";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";

export class PaymentService {
  constructor(
    private repository: PaymentRepository,
    private customerRepository: CustomerRepository
  ) {}

  async getPayments(
    ctx: RequestContext,
    filters?: {
      customerId?: string;
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
      customerId: string;
      amount: number;
      paymentMethod: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
      notes?: string;
      proofImageId?: string;
      referenceNumber?: string;
    }
  ): Promise<MutationResult<Abono>> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para registrar abonos");
    }

    if (data.amount <= 0) {
      throw new ValidationError("El monto debe ser mayor a 0");
    }

    // Validate that payment amount does not exceed customer's debt
    const customerBalance = await this.customerRepository.getBalance(ctx, data.customerId);
    const remainingDebt = customerBalance.balanceDue;

    // Validate that customer has debt to pay
    if (remainingDebt <= 0) {
      throw new ValidationError("El cliente no tiene deuda pendiente");
    }

    // Allow small tolerance for floating point comparison (0.01)
    const OVERPAYMENT_TOLERANCE = 0.01;
    if (data.amount > remainingDebt + OVERPAYMENT_TOLERANCE) {
      throw new ValidationError(
        `El monto del abono (S/ ${data.amount.toFixed(2)}) excede la deuda pendiente (S/ ${remainingDebt.toFixed(2)})`
      );
    }

    return db.transaction(async (tx) => {
      const abono = await this.repository.create(ctx, {
        customerId: data.customerId,
        amount: data.amount.toString(),
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        proofImageId: data.proofImageId,
        referenceNumber: data.referenceNumber,
      }, tx);

      return {
        data: abono,
        txid: await getTxid(tx),
      };
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

  async getTotalPaymentsByCustomer(ctx: RequestContext, customerId: string): Promise<number> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver abonos");
    }

    return this.repository.getTotalByCustomer(ctx, customerId);
  }

  async updatePaymentProof(
    ctx: RequestContext,
    id: string,
    data: {
      proofImageId?: string;
      referenceNumber?: string;
    }
  ): Promise<MutationResult<Abono>> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar abonos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Abono");
    }

    return db.transaction(async (tx) => {
      const abono = await this.repository.update(ctx, id, data, tx);
      return {
        data: abono,
        txid: await getTxid(tx),
      };
    });
  }
}
