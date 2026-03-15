import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const visitaRoutes = new Elysia({ prefix: "/visitas" })
  .use(contextPlugin)
  .use(servicesPlugin)
  // List visits by distribution
  .get(
    "/",
    async ({ visitaService, ctx, query }) => {
      const distribucionId = query.distribucionId;
      if (!distribucionId) {
        return { success: false, error: "distribucionId es requerido" };
      }
      const visitas = await visitaService.getVisitasByDistribucion(ctx as RequestContext, distribucionId);
      return { success: true, data: visitas };
    },
    {
      query: t.Object({
        distribucionId: t.Optional(t.String()),
      }),
    }
  )
  // Get a single visit
  .get(
    "/:id",
    async ({ visitaService, ctx, params }) => {
      const visita = await visitaService.getVisita(ctx as RequestContext, params.id);
      if (!visita) {
        return { success: false, error: "Visita no encontrada" };
      }
      return { success: true, data: visita };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Create a single visit
  .post(
    "/",
    async ({ visitaService, ctx, body, set }) => {
      set.status = 201;
      const visita = await visitaService.createVisita(ctx as RequestContext, body);
      return { success: true, data: visita };
    },
    {
      body: t.Object({
        distribucionId: t.String({ format: "uuid" }),
        customerId: t.String({ format: "uuid" }),
      }),
    }
  )
  // Create multiple visits from group
  .post(
    "/bulk",
    async ({ visitaService, ctx, body, set }) => {
      set.status = 201;
      const visitas = await visitaService.bulkCreateVisitas(ctx as RequestContext, body);
      return { success: true, data: { visits: visitas, count: visitas.length } };
    },
    {
      body: t.Object({
        distribucionId: t.String({ format: "uuid" }),
        customerIds: t.Array(t.String({ format: "uuid" })),
      }),
    }
  )
  // Update visit status
  .patch(
    "/:id",
    async ({ visitaService, ctx, params, body }) => {
      const visita = await visitaService.updateStatus(ctx as RequestContext, params.id, body);
      return { success: true, data: visita };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal("pendiente"),
          t.Literal("compro"),
          t.Literal("no_compra"),
        ]),
        motivoNoCompra: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        saleId: t.Optional(t.String({ format: "uuid" })),
      }),
    }
  )
  // Delete a visit
  .delete(
    "/:id",
    async ({ visitaService, ctx, params, set }) => {
      await visitaService.deleteVisita(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
