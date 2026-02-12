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
        ctx.userId,
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
      const distribucion = await distribucionService.getDistribucion(ctx, params.id);
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
        description: "Obtiene una distribución específica por ID",
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
        kilosAsignados: body.kilosAsignados,
        fecha: body.fecha,
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
        kilosAsignados: t.Number({ minimum: 0.001 }),
        fecha: t.Optional(t.String()),
      }),
      detail: {
        summary: "Crear distribución",
        description: "Crea una nueva asignación de kilos a un vendedor (solo admin)",
        tags: ["Distribuciones"],
      },
    }
  )
  .put(
    "/:id",
    async ({ ctx, params, body, distribucionService }) => {
      const distribucion = await distribucionService.updateDistribucion(ctx, params.id, {
        puntoVenta: body.puntoVenta,
        kilosAsignados: body.kilosAsignados,
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
        kilosAsignados: t.Optional(t.Number({ minimum: 0.001 })),
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
    async ({ ctx, params, distribucionService }) => {
      const distribucion = await distribucionService.closeDistribucion(ctx, params.id);
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
        summary: "Cerrar distribución",
        description: "Cierra una distribución (cambia estado a 'cerrado')",
        tags: ["Distribuciones"],
      },
    }
  )
  .delete(
    "/:id",
    async ({ ctx, params, distribucionService }) => {
      await distribucionService.deleteDistribucion(ctx, params.id);
      return {
        success: true,
        message: "Distribución eliminada correctamente",
      };
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
