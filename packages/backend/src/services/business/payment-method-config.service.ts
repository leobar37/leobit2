import { PaymentMethodConfigRepository } from "../repository/payment-method-config.repository";
import { ValidationError } from "../../errors";
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
    // Validate all required methods are present
    const requiredMethods = ["efectivo", "yape", "plin", "transferencia", "tarjeta"] as const;
    for (const method of requiredMethods) {
      if (!input.methods[method as keyof typeof input.methods]) {
        throw new ValidationError(`El método de pago '${method}' es requerido`);
      }
    }

    // Validate Yape configuration
    if (input.methods.yape.enabled) {
      if (!input.methods.yape.phone) {
        throw new ValidationError("El número de celular es requerido para Yape");
      }
    }

    // Validate Plin configuration
    if (input.methods.plin.enabled) {
      if (!input.methods.plin.phone) {
        throw new ValidationError("El número de celular es requerido para Plin");
      }
    }

    // Validate Transferencia configuration
    if (input.methods.transferencia.enabled) {
      if (!input.methods.transferencia.bank) {
        throw new ValidationError("El banco es requerido para transferencias");
      }
      if (!input.methods.transferencia.accountNumber) {
        throw new ValidationError("El número de cuenta es requerido para transferencias");
      }
    }

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
