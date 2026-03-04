import { PaymentMethodConfigRepository } from "../repository/payment-method-config.repository";
import { ValidationError } from "../../errors";
import type { RequestContext } from "../../context/request-context";
import type { BusinessPaymentSettings } from "../../db/schema";
import { z } from "zod";

const paymentMethodSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bank: z.string().optional(),
  cci: z.string().optional(),
  qrImageUrl: z.string().optional(),
});

const paymentMethodsSchema = z.object({
  efectivo: paymentMethodSchema,
  yape: paymentMethodSchema.refine(
    (data) => !data.enabled || data.phone,
    { message: "El número de celular es requerido para Yape" }
  ),
  plin: paymentMethodSchema.refine(
    (data) => !data.enabled || data.phone,
    { message: "El número de celular es requerido para Plin" }
  ),
  transferencia: paymentMethodSchema.refine(
    (data) => !data.enabled || (data.bank && data.accountNumber),
    { message: "El banco y número de cuenta son requeridos para transferencias" }
  ),
  tarjeta: paymentMethodSchema,
});

const updateInputSchema = z.object({
  methods: paymentMethodsSchema,
});

export type PaymentMethodUpdateInput = z.infer<typeof updateInputSchema>;

export class PaymentMethodConfigService {
  constructor(private repo: PaymentMethodConfigRepository) {}

  async getConfig(ctx: RequestContext): Promise<BusinessPaymentSettings> {
    return this.repo.getOrCreate(ctx);
  }

  async updateConfig(
    ctx: RequestContext,
    input: PaymentMethodUpdateInput
  ): Promise<BusinessPaymentSettings> {
    const result = updateInputSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(String(firstError.message));
    }

    const existing = await this.repo.findByBusinessId(ctx);

    if (existing) {
      return this.repo.update(ctx, existing.id, {
        methods: result.data.methods,
      });
    }

    return this.repo.create(ctx, {
      methods: result.data.methods,
    });
  }
}
