import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const customerGroupRoutes = new Elysia({ prefix: "/groups" })
  .use(contextPlugin)
  .use(servicesPlugin)
  // List all groups
  .get(
    "/",
    async ({ customerGroupService, ctx }) => {
      const groups = await customerGroupService.getGroups(ctx as RequestContext);
      return { success: true, data: groups };
    }
  )
  // Create a new group
  .post(
    "/",
    async ({ customerGroupService, ctx, body, set }) => {
      set.status = 201;
      const group = await customerGroupService.createGroup(ctx as RequestContext, body);
      return { success: true, data: group };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
      }),
    }
  )
  // Get a single group with members
  .get(
    "/:id",
    async ({ customerGroupService, ctx, params }) => {
      const group = await customerGroupService.getGroup(ctx as RequestContext, params.id);
      return { success: true, data: group };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Update a group
  .put(
    "/:id",
    async ({ customerGroupService, ctx, params, body }) => {
      const group = await customerGroupService.updateGroup(ctx as RequestContext, params.id, body);
      return { success: true, data: group };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
      }),
    }
  )
  // Delete a group
  .delete(
    "/:id",
    async ({ customerGroupService, ctx, params, set }) => {
      await customerGroupService.deleteGroup(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Add members to a group
  .post(
    "/:id/members",
    async ({ customerGroupService, ctx, params, body }) => {
      await customerGroupService.addMembers(ctx as RequestContext, params.id, body.customerIds);
      return { success: true, data: { message: "Clientes agregados al grupo" } };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        customerIds: t.Array(t.String()),
      }),
    }
  )
  // Remove a member from a group
  .delete(
    "/:id/members/:customerId",
    async ({ customerGroupService, ctx, params, set }) => {
      await customerGroupService.removeMember(ctx as RequestContext, params.id, params.customerId);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
        customerId: t.String(),
      }),
    }
  );
