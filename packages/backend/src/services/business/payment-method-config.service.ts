import { PaymentMethodConfigRepository } from "../repository/payment-method-config.repository";
import type { RequestContext } from "../../context/request-context";
import type { BusinessPaymentSettings } from "../../db/schema";

export interface PaymentMethodUpdateInput {
  methods: {
    efectivo: { enabled: boolean };
    yape: { enabled: boolean; phone?: string; accountName?: string };
    plin: { enabled: boolean; phone?: string; accountName?: string };
    transferencia: { 
      enabled: boolean; 
      accountNumber?: string; 
      accountName?: string;
      bank?: string;
      cci?: string;
    };
    tarjeta: { enabled: boolean };
  };
}

export class PaymentMethodConfigService {
  constructor(private repo: PaymentMethodConfigRepository) {}

  async getConfig(ctx: RequestContext): Promise<BusinessPaymentSettings> {
    return this.repo.getOrCreate(ctx);
  }

  async updateConfig(
    ctx: RequestContext,
    input: PaymentMethodUpdateInput
  ): Promise<BusinessPaymentSettings> {
    const existing = await this.repo.findByBusinessId(ctx);

    if (existing) {
      return this.repo.update(ctx, existing.id, {
        methods: input.methods,
      });
    }

    return this.repo.create(ctx, {
      methods: input.methods,
    });
  }
}
