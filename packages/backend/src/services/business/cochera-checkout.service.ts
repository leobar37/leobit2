import { CocheraSessionRepository } from "../repository/cochera-session.repository";
import { CocheraSettingsRepository } from "../repository/cochera-settings.repository";
import { SubscriptionService } from "./subscription.service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../../errors";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { z } from "zod";

const checkoutSchema = z.object({
  paymentMethod: z.enum(["efectivo", "yape", "plin"], {
    message: "Método de pago inválido",
  }),
  discount: z.number().min(0).optional().default(0),
});

export type CocheraCheckoutInput = {
  paymentMethod: "efectivo" | "yape" | "plin";
  discount?: number;
};

export interface CocheraCheckoutResult {
  id: string;
  plate: string;
  vehicleType: string;
  entryAt: Date;
  exitAt: Date;
  checkoutAt: Date;
  durationMinutes: number;
  billableHours: number;
  hourlyRate: string;
  discountAmount: string;
  totalAmount: string;
  paymentMethod: string;
  checkoutBy: string | null;
}

export class CocheraCheckoutService {
  constructor(
    private sessionRepo: CocheraSessionRepository,
    private settingsRepo: CocheraSettingsRepository,
    private subscriptionService: SubscriptionService
  ) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError(
        "Esta función solo está disponible para cocheras"
      );
    }
  }

  /**
   * Calculate checkout details without persisting.
   * Used for preview or internal calculation.
   */
  calculateCheckout(
    entryAt: Date,
    checkoutAt: Date,
    hourlyRate: string,
    graceMinutes: number,
    discount: number = 0
  ): {
    durationMinutes: number;
    billableMinutes: number;
    billableHours: number;
    discountAmount: string;
    totalAmount: string;
  } {
    const durationMs = checkoutAt.getTime() - entryAt.getTime();
    const durationMinutes = Math.max(0, Math.floor(durationMs / 1000 / 60));

    const billableMinutes = Math.max(0, durationMinutes - graceMinutes);
    const billableHours = Math.ceil(billableMinutes / 60);

    const rate = Number(hourlyRate);
    const rawAmount = billableHours * rate - discount;
    const totalAmount = Math.max(0, rawAmount);

    return {
      durationMinutes,
      billableMinutes,
      billableHours,
      discountAmount: String(discount.toFixed(2)),
      totalAmount: String(totalAmount.toFixed(2)),
    };
  }

  async checkout(
    ctx: RequestContext,
    sessionId: string,
    input: CocheraCheckoutInput
  ): Promise<CocheraCheckoutResult> {
    this.ensureCocheraMode(ctx);

    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      throw new ValidationError(String(firstError.message));
    }

    const settings = await this.settingsRepo.findByBusinessId(ctx);
    if (!settings) {
      throw new NotFoundError("Configuración de cochera");
    }

    const session = await this.sessionRepo.findById(ctx, sessionId);
    if (!session) {
      throw new NotFoundError("Sesión de vehículo");
    }

    if (session.status === "fuera") {
      throw new ConflictError("Esta sesión ya fue cerrada");
    }

    if (
      !settings.acceptedPaymentMethods.includes(parsed.data.paymentMethod)
    ) {
      throw new ValidationError("Método de pago no aceptado");
    }

    const checkoutAt = new Date();

    const calculation = this.calculateCheckout(
      new Date(session.entryAt),
      checkoutAt,
      settings.hourlyRate,
      settings.graceMinutes,
      parsed.data.discount
    );

    const result = await db.transaction(async (tx) => {
      // Check limit and record usage atomically within the same transaction
      // to prevent race conditions on the Gratis plan counter.
      await this.subscriptionService.checkAndRecordUsage(ctx, tx);

      const updated = await this.sessionRepo.update(
        ctx,
        sessionId,
        {
          status: "fuera",
          exitAt: checkoutAt,
          checkoutAt,
          checkoutBy: ctx.businessUserId,
          totalAmount: calculation.totalAmount,
          discountAmount: calculation.discountAmount,
          paymentMethod: parsed.data.paymentMethod,
        },
        tx
      );

      return updated;
    });

    return {
      id: result.id,
      plate: result.plate,
      vehicleType: result.vehicleType,
      entryAt: new Date(result.entryAt),
      exitAt: new Date(result.exitAt!),
      checkoutAt: new Date(result.checkoutAt!),
      durationMinutes: calculation.durationMinutes,
      billableHours: calculation.billableHours,
      hourlyRate: settings.hourlyRate,
      discountAmount: calculation.discountAmount,
      totalAmount: calculation.totalAmount,
      paymentMethod: result.paymentMethod!,
      checkoutBy: result.checkoutBy ?? null,
    };
  }
}
