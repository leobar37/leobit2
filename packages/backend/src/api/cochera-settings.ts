import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const cocheraSettingsRoutes = new Elysia({ prefix: "/cochera/settings" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ cocheraSettingsService, ctx }) => {
    const settings = await cocheraSettingsService.getSettings(ctx as RequestContext);
    return {
      success: true,
      data: settings,
    };
  })
  .put(
    "/",
    async ({ cocheraSettingsService, ctx, body }) => {
      const settings = await cocheraSettingsService.updateSettings(
        ctx as RequestContext,
        body
      );
      return {
        success: true,
        data: settings,
      };
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String({ maxLength: 120 })),
        displayAddress: t.Optional(t.String()),
        hourlyRate: t.Number({ minimum: 0 }),
        dailyRate: t.Optional(t.Nullable(t.Number({ minimum: 0 }))),
        graceMinutes: t.Integer({ minimum: 0, maximum: 120 }),
        totalSpaces: t.Integer({ minimum: 0 }),
        hourlyBillingEnabled: t.Optional(t.Boolean()),
        hourlyBaseRate: t.Optional(t.Number({ minimum: 0 })),
        hourlyBaseHours: t.Optional(t.Integer({ minimum: 1 })),
        extraHourRate: t.Optional(t.Number({ minimum: 0 })),
        defaultPaymentTiming: t.Optional(t.Union([
          t.Literal("entry"),
          t.Literal("exit"),
        ])),
        acceptedPaymentMethods: t.Array(
          t.Union([t.Literal("efectivo"), t.Literal("yape"), t.Literal("plin")]),
          { minItems: 1 }
        ),
        vehicleTypes: t.Array(
          t.Object({
            id: t.String({ minLength: 2, maxLength: 30 }),
            label: t.String({ minLength: 2, maxLength: 40 }),
            enabled: t.Boolean(),
            isDefault: t.Optional(t.Boolean()),
          }),
          { minItems: 1 }
        ),
      }),
    }
  );
