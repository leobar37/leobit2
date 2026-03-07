import { Elysia, t } from "elysia";
import { contextPlugin } from "../../plugins/context";
import { servicesPlugin } from "../../plugins/services";
import type { RequestContext } from "../../context/request-context";

export const whatsAppSettingsRoutes = new Elysia({
  prefix: "/whatsapp/settings",
})
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ whatsAppSettingsService, ctx }) => {
      const settings = await whatsAppSettingsService.getSettings(
        ctx as RequestContext
      );
      return { success: true, data: settings };
    },
    {
      detail: {
        summary: "Get WhatsApp settings",
        tags: ["WhatsApp"],
      },
    }
  )
  .post(
    "/connect",
    async ({ whatsAppSettingsService, ctx }) => {
      const result = await whatsAppSettingsService.connect(ctx as RequestContext);
      return { success: true, data: result };
    },
    {
      detail: {
        summary: "Connect WhatsApp (returns QR code)",
        tags: ["WhatsApp"],
      },
    }
  )
  .get(
    "/status",
    async ({ whatsAppSettingsService, ctx }) => {
      const status = await whatsAppSettingsService.getStatus(
        ctx as RequestContext
      );
      return { success: true, data: status };
    },
    {
      detail: {
        summary: "Get WhatsApp connection status",
        tags: ["WhatsApp"],
      },
    }
  )
  .post(
    "/disconnect",
    async ({ whatsAppSettingsService, ctx }) => {
      await whatsAppSettingsService.disconnect(ctx as RequestContext);
      return { success: true };
    },
    {
      detail: {
        summary: "Disconnect WhatsApp",
        tags: ["WhatsApp"],
      },
    }
  );
