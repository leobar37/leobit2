import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { CocheraSessionRepository } from "../repository/cochera-session.repository";
import { CocheraSettingsRepository } from "../repository/cochera-settings.repository";
import type {
  CocheraDebtListResult,
  CocheraSessionPaymentResult,
  CreateCocheraSessionPaymentInput,
} from "@avileo/shared";

function money(value: string | null | undefined): number {
  return Number.parseFloat(value ?? "0") || 0;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

export class CocheraDebtService {
  constructor(
    private sessionRepo: CocheraSessionRepository,
    private settingsRepo: CocheraSettingsRepository
  ) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError("Esta función solo está disponible para cocheras");
    }
  }

  async listDebts(
    ctx: RequestContext,
    filters: { search?: string; limit?: number; offset?: number } = {}
  ): Promise<CocheraDebtListResult> {
    this.ensureCocheraMode(ctx);

    const sessions = await this.sessionRepo.listDebts(ctx, filters);
    const totalDebt = sessions.reduce((sum, session) => {
      return sum + money(session.balanceDue);
    }, 0);

    return {
      items: sessions.map((session) => ({
        id: session.id,
        plate: session.plate,
        vehicleType: session.vehicleType as never,
        entryAt: new Date(session.entryAt).toISOString(),
        exitAt: session.exitAt ? new Date(session.exitAt).toISOString() : null,
        checkoutAt: session.checkoutAt ? new Date(session.checkoutAt).toISOString() : null,
        totalAmount: session.totalAmount ?? "0.00",
        amountPaid: session.amountPaid ?? "0.00",
        balanceDue: session.balanceDue ?? "0.00",
        paymentMode: session.paymentMode as never,
        responsibleName: session.responsibleName,
        responsiblePhone: session.responsiblePhone,
        notes: session.notes,
        settlementNotes: session.settlementNotes,
      })),
      summary: {
        totalDebt: toMoney(totalDebt),
        totalSessions: sessions.length,
      },
    };
  }

  async createPayment(
    ctx: RequestContext,
    sessionId: string,
    input: CreateCocheraSessionPaymentInput
  ): Promise<CocheraSessionPaymentResult> {
    this.ensureCocheraMode(ctx);

    if (input.amount <= 0) {
      throw new ValidationError("El monto debe ser mayor a 0");
    }

    const settings = await this.settingsRepo.findByBusinessId(ctx);
    if (!settings) {
      throw new NotFoundError("Configuración de cochera");
    }

    if (!settings.acceptedPaymentMethods.includes(input.paymentMethod)) {
      throw new ValidationError("Método de pago no aceptado");
    }

    return db.transaction(async (tx) => {
      const session = await this.sessionRepo.findById(ctx, sessionId, tx);
      if (!session) {
        throw new NotFoundError("Sesión de vehículo");
      }

      if (session.status !== "fuera") {
        throw new ValidationError("Solo se puede cobrar deuda de sesiones cerradas");
      }

      const currentBalance = money(session.balanceDue);
      if (currentBalance <= 0) {
        throw new ValidationError("La sesión no tiene deuda pendiente");
      }

      const overpaymentTolerance = 0.01;
      if (input.amount > currentBalance + overpaymentTolerance) {
        throw new ValidationError(
          `El monto del abono (S/ ${input.amount.toFixed(2)}) excede la deuda pendiente (S/ ${currentBalance.toFixed(2)})`
        );
      }

      const nextAmountPaid = money(session.amountPaid) + input.amount;
      const nextBalanceDue = Math.max(currentBalance - input.amount, 0);
      const nextPaymentMode =
        nextBalanceDue <= 0 ? "pago_total" : nextAmountPaid > 0 ? "a_cuenta" : "debe_todo";

      const payment = await this.sessionRepo.createPayment(
        ctx,
        {
          sessionId,
          amount: toMoney(input.amount),
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber ?? null,
          proofImageId: input.proofImageId ?? null,
          notes: input.notes ?? null,
        },
        tx
      );

      const updated = await this.sessionRepo.update(
        ctx,
        sessionId,
        {
          amountPaid: toMoney(nextAmountPaid),
          balanceDue: toMoney(nextBalanceDue),
          paymentMode: nextPaymentMode,
          paymentMethod: input.paymentMethod,
        },
        tx
      );

      return {
        payment: {
          ...payment,
          createdAt: new Date(payment.createdAt).toISOString(),
          updatedAt: new Date(payment.updatedAt).toISOString(),
        } as never,
        session: {
          ...updated,
          entryAt: new Date(updated.entryAt).toISOString(),
          exitAt: updated.exitAt ? new Date(updated.exitAt).toISOString() : null,
          checkoutAt: updated.checkoutAt ? new Date(updated.checkoutAt).toISOString() : null,
          createdAt: new Date(updated.createdAt).toISOString(),
          updatedAt: new Date(updated.updatedAt).toISOString(),
        } as never,
      };
    });
  }
}
