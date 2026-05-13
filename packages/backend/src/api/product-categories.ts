import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const productCategoryRoutes = new Elysia({ prefix: "/product-categories" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ categoryService, ctx }) => {
    const categories = await categoryService.listCategories(ctx as RequestContext);
    return { success: true, data: categories };
  })
  .get(
    "/:id",
    async ({ categoryService, ctx, params }) => {
      const category = await categoryService.getCategory(ctx as RequestContext, params.id);
      return { success: true, data: category };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ categoryService, ctx, body, set }) => {
      set.status = 201;
      const result = await categoryService.createCategory(ctx as RequestContext, body);
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
    async ({ categoryService, ctx, params, body }) => {
      const result = await categoryService.updateCategory(
        ctx as RequestContext,
        params.id,
        body
      );
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
    async ({ categoryService, ctx, params, set }) => {
      await categoryService.deleteCategory(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
