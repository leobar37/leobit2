import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const waterRouteRoutes = new Elysia({ prefix: "/water-routes" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ waterRouteService, ctx }) => {
    const routes = await waterRouteService.getRoutes(ctx as RequestContext);
    return { success: true, data: routes };
  })
  .post("/", async ({ waterRouteService, ctx, body, set }) => {
    set.status = 201;
    const route = await waterRouteService.createRoute(ctx as RequestContext, body);
    return { success: true, data: route };
  }, {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      zone: t.Optional(t.Union([t.String(), t.Null()])),
      description: t.Optional(t.Union([t.String(), t.Null()])),
    }),
  })
  .put("/:id", async ({ waterRouteService, ctx, params, body }) => {
    const route = await waterRouteService.updateRoute(ctx as RequestContext, params.id, body);
    return { success: true, data: route };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      zone: t.Optional(t.Union([t.String(), t.Null()])),
      description: t.Optional(t.Union([t.String(), t.Null()])),
      isActive: t.Optional(t.Boolean()),
    }),
  });
