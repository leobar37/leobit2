import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

const vehicleInput = t.Object({
  plate: t.String({ minLength: 1, maxLength: 20 }),
  vehicleType: t.String({ minLength: 2, maxLength: 30 }),
  alias: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
});

export const cocheraCustomerRoutes = new Elysia({ prefix: "/cochera/customers" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ cocheraCustomerService, ctx, query }) => {
      const result = await cocheraCustomerService.listCustomers(ctx as RequestContext, {
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: result };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ cocheraCustomerService, ctx, body, set }) => {
      set.status = 201;
      const result = await cocheraCustomerService.createCustomer(ctx as RequestContext, body);
      return { success: true, data: result };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        dni: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
        phone: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        address: t.Optional(t.Nullable(t.String())),
        notes: t.Optional(t.Nullable(t.String())),
        vehicles: t.Optional(t.Array(vehicleInput)),
      }),
    }
  )
  .get(
    "/:id",
    async ({ cocheraCustomerService, ctx, params }) => {
      const result = await cocheraCustomerService.getCustomer(ctx as RequestContext, params.id);
      return { success: true, data: result };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/:id/vehicles",
    async ({ cocheraCustomerService, ctx, params, body, set }) => {
      set.status = 201;
      const result = await cocheraCustomerService.createVehicle(
        ctx as RequestContext,
        params.id,
        body
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({ id: t.String() }),
      body: vehicleInput,
    }
  )
  .patch(
    "/vehicles/:vehicleId",
    async ({ cocheraCustomerService, ctx, params, body }) => {
      const result = await cocheraCustomerService.updateVehicle(
        ctx as RequestContext,
        params.vehicleId,
        body
      );
      return { success: true, data: result };
    },
    {
      params: t.Object({ vehicleId: t.String() }),
      body: t.Object({
        plate: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
        vehicleType: t.Optional(t.String({ minLength: 2, maxLength: 30 })),
        alias: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
        notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
        active: t.Optional(t.Boolean()),
      }),
    }
  );
