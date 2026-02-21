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
  )
  // Product Variants routes
  .get(
    "/:id/variants",
    async ({ productVariantService, ctx, params, query }) => {
      const variants = await productVariantService.getVariantsByProduct(
        ctx as RequestContext,
        params.id,
        {
          isActive: query.isActive === "true" ? true :
                    query.isActive === "false" ? false : undefined,
          includeInactive: query.includeInactive === "true",
        }
      );
      return { success: true, data: variants };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        isActive: t.Optional(t.String()),
        includeInactive: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/variants",
    async ({ productVariantService, ctx, params, body, set }) => {
      set.status = 201;
      const variant = await productVariantService.createVariant(
        ctx as RequestContext,
        {
          productId: params.id,
          name: body.name,
          sku: body.sku,
          unitQuantity: body.unitQuantity,
          price: body.price,
          isActive: body.isActive,
        }
      );
      return { success: true, data: variant };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 50 }),
        sku: t.Optional(t.String({ maxLength: 50 })),
        unitQuantity: t.Number({ minimum: 0.001, maximum: 9999.999 }),
        price: t.Number({ minimum: 0, maximum: 9999.99 }),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/variants/reorder",
    async ({ productVariantService, ctx, params, body }) => {
      await productVariantService.reorderVariants(
        ctx as RequestContext,
        params.id,
        body.variantIds
      );
      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        variantIds: t.Array(t.String(), { minItems: 1 }),
      }),
    }
  );

export const variantRoutes = new Elysia({ prefix: "/variants" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/:id",
    async ({ productVariantService, ctx, params }) => {
      const variant = await productVariantService.getVariant(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: variant };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .put(
    "/:id",
    async ({ productVariantService, ctx, params, body }) => {
      const variant = await productVariantService.updateVariant(
        ctx as RequestContext,
        params.id,
        {
          name: body.name,
          sku: body.sku,
          unitQuantity: body.unitQuantity,
          price: body.price,
          isActive: body.isActive,
        }
      );
      return { success: true, data: variant };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        sku: t.Optional(t.String({ maxLength: 50 })),
        unitQuantity: t.Optional(t.Number({ minimum: 0.001, maximum: 9999.999 })),
        price: t.Optional(t.Number({ minimum: 0, maximum: 9999.99 })),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  // NOTE: This performs a soft-delete (deactivation). The variant remains in the database
  // with isActive=false for historical reference in sales and inventory records.
  .delete(
    "/:id",
    async ({ productVariantService, ctx, params, set }) => {
      await productVariantService.deactivateVariant(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/:id/inventory",
    async ({ productVariantService, ctx, params }) => {
      const inventory = await productVariantService.getVariantInventory(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: inventory };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .put(
    "/:id/inventory",
    async ({ productVariantService, ctx, params, body }) => {
      const inventory = await productVariantService.updateVariantInventory(
        ctx as RequestContext,
        params.id,
        body.quantity
      );
      return { success: true, data: inventory };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        quantity: t.Number({ minimum: 0 }),
      }),
    }
  );
