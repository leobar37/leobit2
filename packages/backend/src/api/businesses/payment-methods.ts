import { Elysia, t } from "elysia";
import { contextPlugin } from "../../plugins/context";
import { PaymentMethodConfigService } from "../../services/business/payment-method-config.service";
import { PaymentMethodConfigRepository } from "../../services/repository/payment-method-config.repository";
import type { RequestContext } from "../../context/request-context";

const paymentMethodSchema = t.Object({
  enabled: t.Boolean(),
  phone: t.Optional(t.String()),
  accountName: t.Optional(t.String()),
  accountNumber: t.Optional(t.String()),
  bank: t.Optional(t.String()),
  cci: t.Optional(t.String()),
});

export const paymentMethodConfigRoutes = new Elysia({
  prefix: "/businesses/payment-methods",
})
  .use(contextPlugin)
  .decorate(() => ({
    paymentMethodConfigRepo: new PaymentMethodConfigRepository(),
    paymentMethodConfigService: (repo: PaymentMethodConfigRepository) =>
      new PaymentMethodConfigService(repo),
  }))
  .get(
    "/",
    async ({ paymentMethodConfigService, paymentMethodConfigRepo, ctx }) => {
      const service = paymentMethodConfigService(paymentMethodConfigRepo);
      const config = await service.getConfig(ctx as RequestContext);
      return { success: true, data: config };
    },
    {
      detail: {
        summary: "Get payment method configuration",
        tags: ["Business Configuration"],
      },
    }
  )
  .put(
    "/",
    async ({
      paymentMethodConfigService,
      paymentMethodConfigRepo,
      ctx,
      body,
    }) => {
      const service = paymentMethodConfigService(paymentMethodConfigRepo);
      const config = await service.updateConfig(ctx as RequestContext, body);
      return { success: true, data: config };
    },
    {
      body: t.Object({
        methods: t.Object({
          efectivo: paymentMethodSchema,
          yape: paymentMethodSchema,
          plin: paymentMethodSchema,
          transferencia: paymentMethodSchema,
          tarjeta: paymentMethodSchema,
        }),
      }),
      detail: {
        summary: "Update payment method configuration",
        tags: ["Business Configuration"],
      },
    }
  );
