import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import { r2Storage } from "../services/r2-storage.service";
import type { RequestContext } from "../context/request-context";

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
        modoOperacion: body.modoOperacion,
        controlKilos: body.controlKilos,
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
  );
