import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const productUnitsRoutes = new Elysia({ prefix: "/product-units" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ productUnitService, ctx, query }) => {
      const units = await productUnitService.getUnitsByProduct(
        ctx as RequestContext,
        query.productId,
        {
          isActive: query.isActive
            ? query.isActive === "true"
            : undefined,
          includeInactive: query.includeInactive === "true",
        }
      );
      return { success: true, data: units };
    },
    {
      query: t.Object({
        productId: t.String(),
        isActive: t.Optional(t.String()),
        includeInactive: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ productUnitService, ctx, params }) => {
      const unit = await productUnitService.getUnit(ctx as RequestContext, params.id);
      return { success: true, data: unit };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ productUnitService, ctx, body, set }) => {
      set.status = 201;
      const unit = await productUnitService.createUnit(ctx as RequestContext, {
        productId: body.productId,
        variantId: body.variantId,
        name: body.name,
        displayName: body.displayName,
        baseUnitQuantity: body.baseUnitQuantity,
        isActive: body.isActive,
      });
      return { success: true, data: unit };
    },
    {
      body: t.Object({
        productId: t.String(),
        variantId: t.String(),
        name: t.String(),
        displayName: t.String(),
        baseUnitQuantity: t.Number({ minimum: 0.001 }),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ productUnitService, ctx, params, body }) => {
      const unit = await productUnitService.updateUnit(
        ctx as RequestContext,
        params.id,
        {
          name: body.name,
          displayName: body.displayName,
          baseUnitQuantity: body.baseUnitQuantity,
          isActive: body.isActive,
        }
      );
      return { success: true, data: unit };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        displayName: t.Optional(t.String()),
        baseUnitQuantity: t.Optional(t.Number({ minimum: 0.001 })),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ productUnitService, ctx, params, set }) => {
      await productUnitService.deactivateUnit(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/products/:productId/units",
    async ({ productUnitService, ctx, params, query }) => {
      const units = await productUnitService.getUnitsByProduct(
        ctx as RequestContext,
        params.productId,
        {
          isActive: query.isActive
            ? query.isActive === "true"
            : undefined,
          includeInactive: query.includeInactive === "true",
        }
      );
      return { success: true, data: units };
    },
    {
      params: t.Object({
        productId: t.String(),
      }),
      query: t.Object({
        isActive: t.Optional(t.String()),
        includeInactive: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:productId/reorder",
    async ({ productUnitService, ctx, params, body }) => {
      await productUnitService.reorderUnits(
        ctx as RequestContext,
        params.productId,
        body.unitIds
      );
      return { success: true, data: null };
    },
    {
      params: t.Object({
        productId: t.String(),
      }),
      body: t.Object({
        unitIds: t.Array(t.String()),
      }),
    }
  );
