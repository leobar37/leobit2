import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import { r2Storage } from "../services/r2-storage.service";
import type { RequestContext } from "../context/request-context";
import { db } from "../lib/db";
import { businessUsers } from "../db/schema/businesses";
import { user } from "../db/schema/auth";

export const businessRoutes = new Elysia({ prefix: "/businesses" })
  .use(servicesPlugin)
  .use(contextPlugin)
  .get("/me", async ({ businessService, ctx }) => {
    const business = await businessService.getBusiness(ctx as RequestContext);
    return {
      success: true,
      data: business,
    };
  })
  .post(
    "/",
    async ({ businessService, ctx, body }) => {
      const business = await businessService.createBusiness(ctx as RequestContext, {
        name: body.name,
        ruc: body.ruc,
        address: body.address,
        phone: body.phone,
        email: body.email,
      });

      return {
        success: true,
        data: business,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        ruc: t.Optional(t.String({ maxLength: 20 })),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String({ maxLength: 20 })),
        email: t.Optional(t.String({ format: "email" })),
      }),
    }
  )
  .put(
    "/:id",
    async ({ businessService, ctx, params, body }) => {
      const business = await businessService.updateBusiness(ctx as RequestContext, params.id, {
        name: body.name,
        ruc: body.ruc,
        address: body.address,
        phone: body.phone,
        email: body.email,
        usarDistribucion: body.usarDistribucion,
        permitirVentaSinStock: body.permitirVentaSinStock,
      });

      return {
        success: true,
        data: business,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        ruc: t.Optional(t.String({ maxLength: 20 })),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String({ maxLength: 20 })),
        email: t.Optional(t.String({ format: "email" })),
        usarDistribucion: t.Optional(t.Boolean()),
        permitirVentaSinStock: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/logo",
    async ({ businessService, ctx, params, body }) => {
      const { file } = body;

      if (!file || file.size === 0) {
        return { success: false, error: "No file provided" };
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: "Invalid file type. Only JPEG, PNG and WebP allowed",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: "File too large. Max 5MB" };
      }

      const extension = file.name.split(".").pop();
      const path = `businesses/${params.id}/logos/${crypto.randomUUID()}.${extension}`;

      const buffer = await file.arrayBuffer();
      await r2Storage.uploadFile(path, { buffer, type: file.type });

      await businessService.updateLogo(ctx as RequestContext, params.id, path);
      const logoUrl = await r2Storage.getFileUrl(path);

      return {
        success: true,
        data: { logoUrl },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        file: t.File(),
      }),
    }
  )
  .get("/me/members", async ({ ctx }) => {
    const typedCtx = ctx as RequestContext;

    if (!typedCtx.isAdmin()) {
      return {
        success: false,
        error: "No tienes permiso para ver los miembros",
      };
    }

    const members = await db.query.businessUsers.findMany({
      where: eq(businessUsers.businessId, typedCtx.businessId),
      with: {
        business: true,
      },
    });

    const membersWithUserData = await Promise.all(
      members.map(async (member) => {
        const userData = await db.query.user.findFirst({
          where: eq(user.id, member.userId),
        });
        return {
          id: member.id,
          userId: member.userId,
          name: userData?.name || "",
          email: userData?.email || "",
          role: member.role,
          salesPoint: member.salesPoint,
          isActive: member.isActive,
          joinedAt: member.joinedAt,
        };
      })
    );

    return {
      success: true,
      data: membersWithUserData,
    };
  })
  .put(
    "/me/members/:id",
    async ({ ctx, params, body }) => {
      const typedCtx = ctx as RequestContext;

      if (!typedCtx.isAdmin()) {
        return {
          success: false,
          error: "No tienes permiso para editar miembros",
        };
      }

      const member = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.id, params.id),
      });

      if (!member || member.businessId !== typedCtx.businessId) {
        return {
          success: false,
          error: "Miembro no encontrado",
        };
      }

      await db
        .update(businessUsers)
        .set({
          role: body.role,
          salesPoint: body.salesPoint,
          updatedAt: new Date(),
        })
        .where(eq(businessUsers.id, params.id));

      return {
        success: true,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        role: t.Optional(t.Union([t.Literal("ADMIN_NEGOCIO"), t.Literal("VENDEDOR")])),
        salesPoint: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/me/members/:id",
    async ({ ctx, params }) => {
      const typedCtx = ctx as RequestContext;

      if (!typedCtx.isAdmin()) {
        return {
          success: false,
          error: "No tienes permiso para eliminar miembros",
        };
      }

      const member = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.id, params.id),
      });

      if (!member || member.businessId !== typedCtx.businessId) {
        return {
          success: false,
          error: "Miembro no encontrado",
        };
      }

      await db
        .update(businessUsers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(businessUsers.id, params.id));

      return {
        success: true,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
