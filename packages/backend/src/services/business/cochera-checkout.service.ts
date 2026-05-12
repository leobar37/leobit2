import { CocheraSessionRepository } from "../repository/cochera-session.repository";
import { CocheraSettingsRepository } from "../repository/cochera-settings.repository";
import { CustomerRepository } from "../repository/customer.repository";
import { CocheraCustomerVehicleRepository } from "../repository/cochera-customer-vehicle.repository";
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
import {
  calculateCocheraBilling,
  createCocheraPricingSnapshot,
  type CocheraPricingSnapshot,
} from "@avileo/shared";

type PaymentMode = "pago_total" | "a_cuenta" | "debe_todo";
type CocheraPaymentMethod = "efectivo" | "yape" | "plin";

const checkoutSchema = z.object({
  paymentMode: z.enum(["pago_total", "a_cuenta", "debe_todo"]).optional().default("pago_total"),
  amountPaid: z.number().min(0).optional(),
  paymentMethod: z.enum(["efectivo", "yape", "plin"], {
    message: "Método de pago inválido",
  }).optional(),
  responsibleCustomerId: z.string().uuid().nullable().optional(),
  customerVehicleId: z.string().uuid().nullable().optional(),
  shouldCreateCustomerVehicle: z.boolean().optional().default(false),
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
  customerVehicleId?: string | null;
  shouldCreateCustomerVehicle?: boolean;
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
  baseHours: number;
  extraHours: number;
  baseAmount: string;
  extraAmount: string;
  entryAmountPaid: string;
  remainingAmount: string;
  hourlyRate: string;
  discountAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  paymentMode: PaymentMode;
  paymentMethod: string | null;
  responsibleCustomerId: string | null;
  customerVehicleId: string | null;
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
    private subscriptionService: SubscriptionService,
    private customerRepo: CustomerRepository,
    private customerVehicleRepo: CocheraCustomerVehicleRepository
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
    customerVehicleId: string | null;
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
        customerVehicleId: null,
        settlementNotes,
      };
    }

    if (!input.responsibleCustomerId) {
      throw new ValidationError("Selecciona el cliente responsable de la deuda");
    }

    if (paymentMode === "debe_todo") {
      return {
        paymentMode,
        amountPaid: "0.00",
        balanceDue: toMoney(totalAmount),
        paymentMethod: null,
        responsibleName,
        responsiblePhone,
        responsibleCustomerId: input.responsibleCustomerId,
        customerVehicleId: input.customerVehicleId ?? null,
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
      responsibleCustomerId: input.responsibleCustomerId,
      customerVehicleId: input.customerVehicleId ?? null,
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
    pricing: CocheraPricingSnapshot,
    entryAmountPaid: string | number | null = 0,
    discount: number = 0
  ): {
    durationMinutes: number;
    billableMinutes: number;
    billableHours: number;
    baseHours: number;
    extraHours: number;
    baseAmount: string;
    extraAmount: string;
    entryAmountPaid: string;
    remainingAmount: string;
    discountAmount: string;
    totalAmount: string;
  } {
    const calculation = calculateCocheraBilling({
      entryAt,
      checkoutAt,
      pricing,
      entryAmountPaid,
      discount,
    });

    return {
      durationMinutes: calculation.durationMinutes,
      billableMinutes: calculation.billableMinutes,
      billableHours: calculation.billableHours,
      baseHours: calculation.baseHours,
      extraHours: calculation.extraHours,
      baseAmount: toMoney(calculation.baseAmount),
      extraAmount: toMoney(calculation.extraAmount),
      entryAmountPaid: toMoney(calculation.entryAmountPaid),
      remainingAmount: toMoney(calculation.remainingAmount),
      discountAmount: toMoney(calculation.discountAmount),
      totalAmount: toMoney(calculation.totalAmount),
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

    const selectedCustomer = parsed.data.responsibleCustomerId
      ? await this.customerRepo.findById(ctx, parsed.data.responsibleCustomerId)
      : null;

    if (parsed.data.paymentMode !== "pago_total" && !selectedCustomer) {
      throw new ValidationError("Selecciona un cliente válido para la deuda");
    }

    let selectedVehicleId = parsed.data.customerVehicleId ?? null;
    if (selectedVehicleId && selectedCustomer) {
      const vehicle = await this.customerVehicleRepo.findById(ctx, selectedVehicleId);
      if (!vehicle || vehicle.customerId !== selectedCustomer.id) {
        throw new ValidationError("El vehículo no pertenece al cliente seleccionado");
      }
    }

    if (!selectedVehicleId && selectedCustomer) {
      const existingVehicle = await this.customerVehicleRepo.findActiveByPlate(ctx, session.plate);
      if (existingVehicle) {
        if (existingVehicle.customerId !== selectedCustomer.id) {
          throw new ValidationError("La placa ya está asociada a otro cliente");
        }
        selectedVehicleId = existingVehicle.id;
      }
    }

    if (selectedCustomer) {
      parsed.data.responsibleName = selectedCustomer.name;
      parsed.data.responsiblePhone = selectedCustomer.phone;
      parsed.data.customerVehicleId = selectedVehicleId;
    }

    const checkoutAt = new Date();

    const pricing = session.pricingSnapshot ?? createCocheraPricingSnapshot(settings);
    const calculation = this.calculateCheckout(
      new Date(session.entryAt),
      checkoutAt,
      pricing,
      session.entryAmountPaid,
      parsed.data.discount
    );

    const settlement = this.calculateSettlement(
      parseMoney(calculation.remainingAmount),
      parsed.data
    );

    const result = await db.transaction(async (tx) => {
      // Check limit and record usage atomically within the same transaction
      // to prevent race conditions on the Gratis plan counter.
      await this.subscriptionService.checkAndRecordUsage(ctx, tx);

      let customerVehicleId = settlement.customerVehicleId;
      if (
        selectedCustomer &&
        !customerVehicleId &&
        parsed.data.shouldCreateCustomerVehicle
      ) {
        const vehicle = await this.customerVehicleRepo.create(
          ctx,
          {
            customerId: selectedCustomer.id,
            plate: session.plate,
            vehicleType: session.vehicleType,
            alias: null,
            notes: null,
            active: true,
          },
          tx
        );
        customerVehicleId = vehicle.id;
      }

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
          amountPaid: toMoney(parseMoney(calculation.entryAmountPaid) + parseMoney(settlement.amountPaid)),
          balanceDue: settlement.balanceDue,
          paymentMode: settlement.paymentMode,
          paymentMethod: settlement.paymentMethod,
          responsibleCustomerId: settlement.responsibleCustomerId,
          customerVehicleId,
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
      baseHours: calculation.baseHours,
      extraHours: calculation.extraHours,
      baseAmount: calculation.baseAmount,
      extraAmount: calculation.extraAmount,
      entryAmountPaid: calculation.entryAmountPaid,
      remainingAmount: calculation.remainingAmount,
      hourlyRate: pricing.hourlyBillingEnabled ? pricing.extraHourRate : pricing.hourlyRate,
      discountAmount: calculation.discountAmount,
      totalAmount: calculation.totalAmount,
      amountPaid: result.amountPaid ?? settlement.amountPaid,
      balanceDue: result.balanceDue ?? settlement.balanceDue,
      paymentMode: (result.paymentMode ?? settlement.paymentMode) as PaymentMode,
      paymentMethod: result.paymentMethod ?? null,
      responsibleCustomerId: result.responsibleCustomerId ?? null,
      customerVehicleId: result.customerVehicleId ?? null,
      responsibleName: result.responsibleName ?? null,
      responsiblePhone: result.responsiblePhone ?? null,
      checkoutBy: result.checkoutBy ?? null,
    };
  }
}
