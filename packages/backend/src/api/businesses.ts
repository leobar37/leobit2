import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { db } from "../lib/db";
import { businesses, businessUsers } from "../db/schema/businesses";
import { r2Storage } from "../services/r2-storage.service";

export const businessRoutes = new Elysia({ prefix: "/businesses" })
  .use(requireAuth)
  .get("/me", async (ctx) => {
    const user = (ctx as any).user;
    const membership = await db.query.businessUsers.findFirst({
      where: eq(businessUsers.userId, user.id),
      with: { business: true },
    });

    if (!membership) {
      return { success: false, error: "No business found" };
    }

    const business = membership.business as any;
    const logoUrl = business.logoUrl
      ? await r2Storage.getFileUrl(business.logoUrl)
      : null;

    return {
      success: true,
      data: {
        id: business.id,
        name: business.name,
        ruc: business.ruc,
        address: business.address,
        phone: business.phone,
        email: business.email,
        logoUrl,
        modoOperacion: business.modoOperacion,
        controlKilos: business.controlKilos,
        usarDistribucion: business.usarDistribucion,
        permitirVentaSinStock: business.permitirVentaSinStock,
        role: membership.role,
        salesPoint: membership.salesPoint,
        isActive: business.isActive,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
    };
  })
  .post(
    "/",
    async (ctx) => {
      const user = (ctx as any).user;
      const body = ctx.body as any;
      
      const existingMembership = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.userId, user.id),
      });

      if (existingMembership) {
        return {
          success: false,
          error: "El usuario ya tiene un negocio asociado",
        };
      }

      const [business] = await db
        .insert(businesses)
        .values({
          name: body.name,
          ruc: body.ruc || null,
          address: body.address || null,
          phone: body.phone || null,
          email: body.email || null,
        })
        .returning();

      await db.insert(businessUsers).values({
        businessId: business.id,
        userId: user.id,
        role: "ADMIN_NEGOCIO",
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
    async (ctx) => {
      const user = (ctx as any).user;
      const params = ctx.params as any;
      const body = ctx.body as any;
      
      const membership = await db.query.businessUsers.findFirst({
        where: and(
          eq(businessUsers.userId, user.id),
          eq(businessUsers.businessId, params.id)
        ),
      });

      if (!membership || membership.role !== "ADMIN_NEGOCIO") {
        return {
          success: false,
          error: "No tienes permiso para editar este negocio",
        };
      }

      const [business] = await db
        .update(businesses)
        .set({
          name: body.name,
          ruc: body.ruc,
          address: body.address,
          phone: body.phone,
          email: body.email,
          modoOperacion: body.modoOperacion,
          controlKilos: body.controlKilos,
          usarDistribucion: body.usarDistribucion,
          permitirVentaSinStock: body.permitirVentaSinStock,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, params.id))
        .returning();

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
        modoOperacion: t.Optional(
          t.Union([
            t.Literal("inventario_propio"),
            t.Literal("sin_inventario"),
            t.Literal("pedidos"),
            t.Literal("mixto"),
          ])
        ),
        controlKilos: t.Optional(t.Boolean()),
        usarDistribucion: t.Optional(t.Boolean()),
        permitirVentaSinStock: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/logo",
    async (ctx) => {
      const user = (ctx as any).user;
      const params = ctx.params as any;
      const body = ctx.body as any;
      
      const membership = await db.query.businessUsers.findFirst({
        where: and(
          eq(businessUsers.userId, user.id),
          eq(businessUsers.businessId, params.id)
        ),
      });

      if (!membership || membership.role !== "ADMIN_NEGOCIO") {
        return {
          success: false,
          error: "No tienes permiso para editar este negocio",
        };
      }

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

      const [business] = await db
        .update(businesses)
        .set({ logoUrl: path, updatedAt: new Date() })
        .where(eq(businesses.id, params.id))
        .returning();

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
  );
