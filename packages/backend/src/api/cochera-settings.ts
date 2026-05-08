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
        acceptedPaymentMethods: t.Array(
          t.Union([t.Literal("efectivo"), t.Literal("yape"), t.Literal("plin")]),
          { minItems: 1 }
        ),
      }),
    }
  );
