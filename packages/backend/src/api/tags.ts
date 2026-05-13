import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const tagRoutes = new Elysia({ prefix: "/tags" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ tagService, ctx }) => {
      const tags = await tagService.listTags(ctx as RequestContext);
      return { success: true, data: tags };
    }
  )
  .get(
    "/:id",
    async ({ tagService, ctx, params }) => {
      const tag = await tagService.getTag(ctx as RequestContext, params.id);
      return { success: true, data: tag };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ tagService, ctx, body, set }) => {
      set.status = 201;
      const result = await tagService.createTag(ctx as RequestContext, body);
      return { success: true, data: result.data };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        color: t.Optional(t.String({ pattern: "^#[0-9A-Fa-f]{6}$" })),
      }),
    }
  )
  .put(
    "/:id",
    async ({ tagService, ctx, params, body }) => {
      const result = await tagService.updateTag(ctx as RequestContext, params.id, body);
      return { success: true, data: result.data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        color: t.Optional(t.String({ pattern: "^#[0-9A-Fa-f]{6}$" })),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ tagService, ctx, params, set }) => {
      await tagService.deleteTag(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
