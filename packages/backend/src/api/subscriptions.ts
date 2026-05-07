import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const subscriptionRoutes = new Elysia({ prefix: "/subscriptions" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/status", async ({ subscriptionService, ctx }) => {
    const status = await subscriptionService.getStatus(ctx as RequestContext);
    return {
      success: true,
      data: status,
    };
  })
  .post(
    "/check-limit",
    async ({ subscriptionService, ctx, body }) => {
      const result = await subscriptionService.checkLimit(
        ctx as RequestContext,
        body.action
      );
      return {
        success: true,
        data: result,
      };
    },
    {
      body: t.Object({
        action: t.Union([
          t.Literal("create_record"),
          t.Literal("export"),
          t.Literal("report"),
        ]),
      }),
    }
  );
