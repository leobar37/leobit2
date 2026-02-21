import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ customerService, ctx, query }) => {
      const customers = await customerService.getCustomers(ctx as RequestContext, {
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: customers };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ customerService, ctx, params }) => {
      const customer = await customerService.getCustomer(ctx as RequestContext, params.id);
      return { success: true, data: customer };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/:id/balance",
    async ({ customerService, ctx, params }) => {
      const balance = await customerService.getBalance(ctx as RequestContext, params.id);
      return { success: true, data: balance };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ customerService, ctx, body, set }) => {
      set.status = 201;
      const customer = await customerService.createCustomer(ctx as RequestContext, body);
      return { success: true, data: customer };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        dni: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ customerService, ctx, params, body }) => {
      const customer = await customerService.updateCustomer(ctx as RequestContext, params.id, body);
      return { success: true, data: customer };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        dni: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ customerService, ctx, params, set }) => {
      await customerService.deleteCustomer(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
