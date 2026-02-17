import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const supplierRoutes = new Elysia({ prefix: "/suppliers" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ supplierService, ctx, query }) => {
      const suppliers = await supplierService.getSuppliers(ctx as RequestContext, {
        search: query.search,
        type: query.type as "generic" | "regular" | "internal" | undefined,
        isActive: query.isActive ? query.isActive === "true" : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: suppliers };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        type: t.Optional(t.String()),
        isActive: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/generic",
    async ({ supplierService, ctx }) => {
      const supplier = await supplierService.getGenericSupplier(ctx as RequestContext);
      return { success: true, data: supplier };
    }
  )
  .get(
    "/:id",
    async ({ supplierService, ctx, params }) => {
      const supplier = await supplierService.getSupplier(ctx as RequestContext, params.id);
      return { success: true, data: supplier };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ supplierService, ctx, body, set }) => {
      set.status = 201;
      const supplier = await supplierService.createSupplier(ctx as RequestContext, body);
      return { success: true, data: supplier };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        type: t.Optional(t.Union([t.Literal("generic"), t.Literal("regular"), t.Literal("internal")])),
        ruc: t.Optional(t.String()),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ supplierService, ctx, params, body }) => {
      const supplier = await supplierService.updateSupplier(ctx as RequestContext, params.id, body);
      return { success: true, data: supplier };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        ruc: t.Optional(t.String()),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ supplierService, ctx, params, set }) => {
      await supplierService.deleteSupplier(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
