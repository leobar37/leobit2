import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const productRoutes = new Elysia({ prefix: "/products" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ productService, ctx, query }) => {
      const products = await productService.getProducts(ctx as RequestContext, {
        search: query.search,
        type: query.type as any,
        isActive: query.isActive === "true" ? true : query.isActive === "false" ? false : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: products };
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
    "/:id",
    async ({ productService, ctx, params }) => {
      const product = await productService.getProduct(ctx as RequestContext, params.id);
      return { success: true, data: product };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ productService, ctx, body, set }) => {
      set.status = 201;
      const product = await productService.createProduct(ctx as RequestContext, {
        ...body,
        basePrice: parseFloat(body.basePrice),
      });
      return { success: true, data: product };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        type: t.Union([t.Literal("pollo"), t.Literal("huevo"), t.Literal("otro")]),
        unit: t.Union([t.Literal("kg"), t.Literal("unidad")]),
        basePrice: t.String(),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ productService, ctx, params, body }) => {
      const product = await productService.updateProduct(ctx as RequestContext, params.id, {
        ...body,
        basePrice: body.basePrice ? parseFloat(body.basePrice) : undefined,
      });
      return { success: true, data: product };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        type: t.Optional(t.Union([t.Literal("pollo"), t.Literal("huevo"), t.Literal("otro")])),
        unit: t.Optional(t.Union([t.Literal("kg"), t.Literal("unidad")])),
        basePrice: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ productService, ctx, params, set }) => {
      await productService.deleteProduct(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
