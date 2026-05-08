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

type PaymentMode = "pago_total" | "a_cuenta" | "debe_todo";
type CocheraPaymentMethod = "efectivo" | "yape" | "plin";

const checkoutSchema = z.object({
  paymentMode: z.enum(["pago_total", "a_cuenta", "debe_todo"]).optional().default("pago_total"),
  amountPaid: z.number().min(0).optional(),
  paymentMethod: z.enum(["efectivo", "yape", "plin"], {
    message: "Método de pago inválido",
  }).optional(),
  responsibleCustomerId: z.string().uuid().nullable().optional(),
  responsibleName: z.string().trim().max(160).nullable().optional(),
  responsiblePhone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  discount: z.number().min(0).optional().default(0),
});

export type CocheraCheckoutInput = {
  paymentMode?: PaymentMode;
  amountPaid?: number;
  paymentMethod?: CocheraPaymentMethod;
  responsibleCustomerId?: string | null;
  responsibleName?: string | null;
  responsiblePhone?: string | null;
  notes?: string | null;
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
  amountPaid: string;
  balanceDue: string;
  paymentMode: PaymentMode;
  paymentMethod: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  checkoutBy: string | null;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

function parseMoney(value: string | null | undefined): number {
  return Number.parseFloat(value ?? "0") || 0;
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

  private calculateSettlement(
    totalAmount: number,
    input: z.infer<typeof checkoutSchema>
  ): {
    paymentMode: PaymentMode;
    amountPaid: string;
    balanceDue: string;
    paymentMethod: CocheraPaymentMethod | null;
    responsibleName: string | null;
    responsiblePhone: string | null;
    responsibleCustomerId: string | null;
    settlementNotes: string | null;
  } {
    const paymentMode = input.paymentMode;
    const responsibleName = input.responsibleName?.trim() || null;
    const responsiblePhone = input.responsiblePhone?.trim() || null;
    const settlementNotes = input.notes?.trim() || null;

    if (paymentMode === "pago_total") {
      if (totalAmount > 0 && !input.paymentMethod) {
        throw new ValidationError("Selecciona un método de pago");
      }

      return {
        paymentMode,
        amountPaid: toMoney(totalAmount),
        balanceDue: "0.00",
        paymentMethod: input.paymentMethod ?? null,
        responsibleName: null,
        responsiblePhone: null,
        responsibleCustomerId: null,
        settlementNotes,
      };
    }

    if (!responsibleName) {
      throw new ValidationError("Ingresa el responsable de la deuda");
    }

    if (paymentMode === "debe_todo") {
      return {
        paymentMode,
        amountPaid: "0.00",
        balanceDue: toMoney(totalAmount),
        paymentMethod: null,
        responsibleName,
        responsiblePhone,
        responsibleCustomerId: input.responsibleCustomerId ?? null,
        settlementNotes,
      };
    }

    const amountPaid = input.amountPaid ?? 0;

    if (amountPaid <= 0) {
      throw new ValidationError("El monto a cuenta debe ser mayor a cero");
    }

    if (amountPaid >= totalAmount) {
      throw new ValidationError("El monto a cuenta debe ser menor al total");
    }

    if (!input.paymentMethod) {
      throw new ValidationError("Selecciona un método de pago");
    }

    return {
      paymentMode,
      amountPaid: toMoney(amountPaid),
      balanceDue: toMoney(totalAmount - amountPaid),
      paymentMethod: input.paymentMethod,
      responsibleName,
      responsiblePhone,
      responsibleCustomerId: input.responsibleCustomerId ?? null,
      settlementNotes,
    };
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
      parsed.data.paymentMethod &&
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

    const settlement = this.calculateSettlement(
      parseMoney(calculation.totalAmount),
      parsed.data
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
          amountPaid: settlement.amountPaid,
          balanceDue: settlement.balanceDue,
          paymentMode: settlement.paymentMode,
          paymentMethod: settlement.paymentMethod,
          responsibleCustomerId: settlement.responsibleCustomerId,
          responsibleName: settlement.responsibleName,
          responsiblePhone: settlement.responsiblePhone,
          settlementNotes: settlement.settlementNotes,
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
      amountPaid: result.amountPaid ?? settlement.amountPaid,
      balanceDue: result.balanceDue ?? settlement.balanceDue,
      paymentMode: (result.paymentMode ?? settlement.paymentMode) as PaymentMode,
      paymentMethod: result.paymentMethod ?? null,
      responsibleName: result.responsibleName ?? null,
      responsiblePhone: result.responsiblePhone ?? null,
      checkoutBy: result.checkoutBy ?? null,
    };
  }
}
