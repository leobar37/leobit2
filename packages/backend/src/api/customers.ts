import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ customerService, customerTagService, ctx, query }) => {
      let customerIds: string[] | undefined;

      // If tagIds provided, filter by tags
      if (query.tagIds) {
        const tagIds = query.tagIds.split(",").filter(Boolean);
        if (tagIds.length > 0) {
          customerIds = await customerTagService.getCustomersByTags(ctx as RequestContext, tagIds);
        }
      }

      const customers = await customerService.getCustomers(ctx as RequestContext, {
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
        customerIds, // Filter by tag results if provided
      });
      return { success: true, data: customers };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        tagIds: t.Optional(t.String()),
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
      const result = await customerService.createCustomer(ctx as RequestContext, body);
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        dni: t.Optional(t.Union([t.String(), t.Null()])),
        phone: t.Optional(t.Union([t.String(), t.Null()])),
        address: t.Optional(t.Union([t.String(), t.Null()])),
        notes: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .put(
    "/:id",
    async ({ customerService, ctx, params, body }) => {
      const result = await customerService.updateCustomer(ctx as RequestContext, params.id, body);
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        dni: t.Optional(t.Union([t.String(), t.Null()])),
        phone: t.Optional(t.Union([t.String(), t.Null()])),
        address: t.Optional(t.Union([t.String(), t.Null()])),
        notes: t.Optional(t.Union([t.String(), t.Null()])),
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
  )
  // Customer Tags endpoints
  .get(
    "/:id/tags",
    async ({ customerTagService, ctx, params }) => {
      const tags = await customerTagService.getCustomerTags(ctx as RequestContext, params.id);
      return { success: true, data: tags };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/tags",
    async ({ customerTagService, ctx, params, body }) => {
      const tags = await customerTagService.assignTags(ctx as RequestContext, params.id, body.tagIds);
      return { success: true, data: tags };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        tagIds: t.Array(t.String()),
      }),
    }
  )
  // Bulk tag assignment endpoint
  .post(
    "/bulk/tags",
    async ({ customerTagService, ctx, body }) => {
      await customerTagService.assignTagsBulk(ctx as RequestContext, body.customerIds, body.tagIds);
      return { success: true, data: { success: true, message: "Etiquetas asignadas correctamente" } };
    },
    {
      body: t.Object({
        customerIds: t.Array(t.String()),
        tagIds: t.Array(t.String()),
      }),
    }
  );
