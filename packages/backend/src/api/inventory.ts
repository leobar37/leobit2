import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import { ValidationError } from "../errors";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ ctx, inventoryService }) => {
      const inventory = await inventoryService.getInventory(ctx);
      return {
        success: true,
        data: inventory,
      };
    },
    {
      detail: {
        summary: "Listar inventario",
        description: "Obtiene el stock de todos los productos",
        tags: ["Inventory"],
      },
    }
  )
  .get(
    "/:productId",
    async ({ ctx, params, inventoryService }) => {
      const item = await inventoryService.getInventoryItem(ctx, params.productId);
      return {
        success: true,
        data: item,
      };
    },
    {
      params: t.Object({
        productId: t.String(),
      }),
      detail: {
        summary: "Obtener stock de producto",
        description: "Obtiene el stock de un producto específico",
        tags: ["Inventory"],
      },
    }
  )
  .put(
    "/:productId",
    async ({ ctx, params, body, inventoryService }) => {
      const item = await inventoryService.updateStock(
        ctx,
        params.productId,
        body.quantity
      );
      return {
        success: true,
        data: item,
      };
    },
    {
      params: t.Object({
        productId: t.String(),
      }),
      body: t.Object({
        quantity: t.Number({ minimum: 0 }),
      }),
      detail: {
        summary: "Actualizar stock",
        description: "Actualiza la cantidad en stock de un producto (solo admin)",
        tags: ["Inventory"],
      },
    }
  )
  .post(
    "/:productId/validate",
    async ({ ctx, params, body, inventoryService }) => {
      const result = await inventoryService.validateStockAvailability(
        ctx,
        params.productId,
        body.requestedQty
      );
      return {
        success: true,
        data: result,
      };
    },
    {
      params: t.Object({
        productId: t.String(),
      }),
      body: t.Object({
        requestedQty: t.Number({ minimum: 0 }),
      }),
      detail: {
        summary: "Validar stock disponible",
        description: "Verifica si hay suficiente stock para una cantidad solicitada",
        tags: ["Inventory"],
      },
    }
  );
