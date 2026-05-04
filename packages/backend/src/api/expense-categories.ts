import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const expenseCategoryRoutes = new Elysia({ prefix: "/expense-categories" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ expenseCategoryService, ctx }) => {
      const categories = await expenseCategoryService.getCategories(ctx as RequestContext);
      return { success: true, data: categories };
    }
  )
  .get(
    "/active",
    async ({ expenseCategoryService, ctx }) => {
      const categories = await expenseCategoryService.getActiveCategories(ctx as RequestContext);
      return { success: true, data: categories };
    }
  )
  .get(
    "/:id",
    async ({ expenseCategoryService, ctx, params }) => {
      const category = await expenseCategoryService.getCategory(ctx as RequestContext, params.id);
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
    async ({ expenseCategoryService, ctx, body, set }) => {
      set.status = 201;
      const result = await expenseCategoryService.createCategory(ctx as RequestContext, {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
      });
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        icon: t.Optional(t.String({ maxLength: 50 })),
        color: t.Optional(t.String({ maxLength: 20 })),
      }),
    }
  )
  .put(
    "/:id",
    async ({ expenseCategoryService, ctx, params, body }) => {
      const result = await expenseCategoryService.updateCategory(ctx as RequestContext, params.id, {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        isActive: body.isActive,
      });
      return { success: true, data: result.data, txid: result.txid };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        icon: t.Optional(t.String({ maxLength: 50 })),
        color: t.Optional(t.String({ maxLength: 20 })),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ expenseCategoryService, ctx, params, set }) => {
      await expenseCategoryService.deleteCategory(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/seed",
    async ({ expenseCategoryService, ctx }) => {
      await expenseCategoryService.seedDefaultCategories(ctx as RequestContext);
      return { success: true, data: { message: "Categorias por defecto creadas" } };
    }
  );
