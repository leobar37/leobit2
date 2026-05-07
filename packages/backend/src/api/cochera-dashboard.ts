import { Elysia } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const cocheraDashboardRoutes = new Elysia({ prefix: "/cochera/dashboard" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ cocheraSessionService, ctx }) => {
      const dashboard = await cocheraSessionService.getDashboard(ctx as RequestContext);
      return {
        success: true,
        data: dashboard,
      };
    }
  );
