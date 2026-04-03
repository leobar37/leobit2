import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";

export const distribucionRoutes = new Elysia({ prefix: "/distribuciones" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ ctx, query, distribucionService }) => {
      const distribuciones = await distribucionService.getDistribuciones(ctx, {
        fecha: query.fecha,
        vendedorId: query.vendedorId,
        estado: query.estado as "activo" | "cerrado" | "en_ruta" | undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return {
        success: true,
        data: distribuciones,
      };
    },
    {
      query: t.Object({
        fecha: t.Optional(t.String()),
        vendedorId: t.Optional(t.String()),
        estado: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        summary: "Listar distribuciones",
        description: "Lista todas las distribuciones del negocio (admin: todas, vendedor: solo propias)",
        tags: ["Distribuciones"],
      },
    }
  )
  .get(
    "/mine",
    async ({ ctx, query, distribucionService }) => {
      const distribucion = await distribucionService.getDistribucionForVendedor(
        ctx,
        ctx.businessUserId,
        query.fecha
      );
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      query: t.Object({
        fecha: t.Optional(t.String()),
      }),
      detail: {
        summary: "Mi distribución",
        description: "Obtiene la distribución del vendedor actual para hoy (o fecha especificada)",
        tags: ["Distribuciones"],
      },
    }
  )
  .get(
    "/:id",
    async ({ ctx, params, distribucionService }) => {
      const distribucion = await distribucionService.getDistribucionWithItems(ctx, params.id);
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Obtener distribución",
        description: "Obtiene una distribución específica por ID con sus items",
        tags: ["Distribuciones"],
      },
    }
  )
  .get(
    "/:id/stock",
    async ({ ctx, params, distribucionService }) => {
      const stock = await distribucionService.getStockDisponible(ctx, params.id);
      return {
        success: true,
        data: stock,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Stock disponible",
        description: "Calcula el stock disponible de una distribución (asignado - vendido)",
        tags: ["Distribuciones"],
      },
    }
  )
  .post(
    "/",
    async ({ ctx, body, distribucionService }) => {
      const distribucion = await distribucionService.createDistribucion(ctx, {
        vendedorId: body.vendedorId,
        puntoVenta: body.puntoVenta,
        puntoVentaId: body.puntoVentaId,
        notaCreacion: body.notaCreacion,
        fecha: body.fecha,
        groupId: body.groupId,
        items: body.items,
      });
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      body: t.Object({
        vendedorId: t.String(),
        puntoVenta: t.String({ minLength: 2 }),
        puntoVentaId: t.Optional(t.String()),
        notaCreacion: t.Optional(t.String()),
        fecha: t.Optional(t.String()),
        groupId: t.Optional(t.String()),
        items: t.Optional(t.Array(
          t.Object({
            variantId: t.String(),
            cantidadAsignada: t.Number({ minimum: 0.001 }),
            unidad: t.String(),
          })
        )),
      }),
      detail: {
        summary: "Crear distribución",
        description: "Crea una nueva asignación a un vendedor. Si se proporciona groupId, se crean visitas automáticamente para todos los clientes del grupo.",
        tags: ["Distribuciones"],
      },
    }
  )
  .put(
    "/:id",
    async ({ ctx, params, body, distribucionService }) => {
      const distribucion = await distribucionService.updateDistribucion(ctx, params.id, {
        puntoVenta: body.puntoVenta,
        estado: body.estado as "activo" | "cerrado" | "en_ruta" | undefined,
      });
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        puntoVenta: t.Optional(t.String({ minLength: 2 })),
        estado: t.Optional(t.String()),
      }),
      detail: {
        summary: "Actualizar distribución",
        description: "Actualiza una distribución existente (solo admin)",
        tags: ["Distribuciones"],
      },
    }
  )
  .patch(
    "/:id/close",
    async ({ ctx, params, body, distribucionService }) => {
      const distribucion = await distribucionService.closeDistribucion(ctx, params.id, {
        notaCierre: body?.notaCierre,
      });
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Optional(t.Object({
        notaCierre: t.Optional(t.String()),
      })),
      detail: {
        summary: "Cerrar distribución",
        description: "Cierra una distribución (cambia estado a 'cerrado'). Las métricas se calculan desde los items.",
        tags: ["Distribuciones"],
      },
    }
  )
  .get(
    "/:id/items",
    async ({ ctx, params, distribucionService }) => {
      const items = await distribucionService.getDistribucionItems(ctx, params.id);
      return {
        success: true,
        data: items,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Listar items de distribución",
        description: "Obtiene todos los items de una distribución",
        tags: ["Distribuciones"],
      },
    }
  )
  .put(
    "/:id/items",
    async ({ ctx, params, body, distribucionService }) => {
      const distribucion = await distribucionService.replaceDistribucionItems(
        ctx,
        params.id,
        body.items
      );
      return {
        success: true,
        data: distribucion,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        items: t.Array(
          t.Object({
            variantId: t.String(),
            cantidadAsignada: t.Number({ minimum: 0.001 }),
            unidad: t.String(),
          })
        ),
      }),
      detail: {
        summary: "Reemplazar items de distribución",
        description: "Reemplaza todos los items de una distribución en modo libre. Solo para distribuciones creadas sin productos.",
        tags: ["Distribuciones"],
      },
    }
  )
  .delete(
    "/:id",
    async ({ ctx, params, distribucionService, set }) => {
      await distribucionService.deleteDistribucion(ctx, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Eliminar distribución",
        description: "Elimina una distribución (solo admin)",
        tags: ["Distribuciones"],
      },
    }
  );
