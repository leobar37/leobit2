import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { NotFoundError, ValidationError } from "../errors";
import { puntoVentaTypes } from "../db/schema/puntos-venta";

export const puntoVentaRoutes = new Elysia({ prefix: "/puntos-venta" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ puntoVentaRepo, ctx }) => {
      const puntos = await puntoVentaRepo.findAll(ctx as RequestContext);
      return { success: true, data: puntos };
    }
  )
  .get(
    "/active",
    async ({ puntoVentaRepo, ctx }) => {
      const puntos = await puntoVentaRepo.findAllActive(ctx as RequestContext);
      return { success: true, data: puntos };
    }
  )
  .get(
    "/:id",
    async ({ puntoVentaRepo, ctx, params }) => {
      const punto = await puntoVentaRepo.findById(ctx as RequestContext, params.id);
      if (!punto) throw new NotFoundError("Punto de venta");
      return { success: true, data: punto };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ puntoVentaRepo, ctx, body, set }) => {
      const existing = await puntoVentaRepo.findByName(ctx as RequestContext, body.name);
      if (existing) {
        throw new ValidationError("Ya existe un punto de venta con ese nombre");
      }

      const punto = await puntoVentaRepo.create(ctx as RequestContext, {
        name: body.name,
        code: body.code,
        description: body.description,
        type: body.type,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      });

      set.status = 201;
      return { success: true, data: punto };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        code: t.Optional(t.String({ maxLength: 20 })),
        description: t.Optional(t.String({ maxLength: 255 })),
        type: t.Optional(t.Union(puntoVentaTypes.map(v => t.Literal(v)))),
        isActive: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Integer()),
      }),
      detail: {
        summary: "Crear punto de venta",
        description: "Crea un nuevo punto de venta para el negocio",
        tags: ["Puntos de Venta"],
      },
    }
  )
  .put(
    "/:id",
    async ({ puntoVentaRepo, ctx, params, body }) => {
      const existing = await puntoVentaRepo.findById(ctx as RequestContext, params.id);
      if (!existing) throw new NotFoundError("Punto de venta");

      if (body.name && body.name !== existing.name) {
        const duplicate = await puntoVentaRepo.findByName(ctx as RequestContext, body.name);
        if (duplicate) {
          throw new ValidationError("Ya existe un punto de venta con ese nombre");
        }
      }

      const punto = await puntoVentaRepo.update(ctx as RequestContext, params.id, {
        name: body.name,
        code: body.code,
        description: body.description,
        type: body.type,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      });

      return { success: true, data: punto };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        code: t.Optional(t.String({ maxLength: 20 })),
        description: t.Optional(t.String({ maxLength: 255 })),
        type: t.Optional(t.Union(puntoVentaTypes.map(v => t.Literal(v)))),
        isActive: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Integer()),
      }),
      detail: {
        summary: "Actualizar punto de venta",
        description: "Actualiza un punto de venta existente",
        tags: ["Puntos de Venta"],
      },
    }
  )
  .patch(
    "/:id/toggle",
    async ({ puntoVentaRepo, ctx, params }) => {
      const existing = await puntoVentaRepo.findById(ctx as RequestContext, params.id);
      if (!existing) throw new NotFoundError("Punto de venta");

      const punto = await puntoVentaRepo.toggleActive(ctx as RequestContext, params.id);
      return { success: true, data: punto };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Activar/inactivar punto de venta",
        description: "Cambia el estado activo de un punto de venta",
        tags: ["Puntos de Venta"],
      },
    }
  )
  .delete(
    "/:id",
    async ({ puntoVentaRepo, ctx, params, set }) => {
      const existing = await puntoVentaRepo.findById(ctx as RequestContext, params.id);
      if (!existing) throw new NotFoundError("Punto de venta");

      await puntoVentaRepo.delete(ctx as RequestContext, params.id);
      set.status = 204;
      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Eliminar punto de venta",
        description: "Elimina un punto de venta (solo si no está en uso)",
        tags: ["Puntos de Venta"],
      },
    }
  );
