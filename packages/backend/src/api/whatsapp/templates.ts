import { Elysia, t } from "elysia";
import { contextPlugin } from "../../plugins/context";
import { servicesPlugin } from "../../plugins/services";
import type { RequestContext } from "../../context/request-context";

export const whatsappTemplateRoutes = new Elysia({ prefix: "/whatsapp/templates" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ whatsAppTemplateService, ctx, query }) => {
      const templates = await whatsAppTemplateService.getAllTemplates(
        ctx as RequestContext,
        {
          search: query.search,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined,
        }
      );
      return { success: true, data: templates };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/default",
    async ({ whatsAppTemplateService, ctx }) => {
      const template = await whatsAppTemplateService.getDefaultTemplate(
        ctx as RequestContext
      );
      return { success: true, data: template };
    }
  )
  .get(
    "/:id",
    async ({ whatsAppTemplateService, ctx, params }) => {
      const template = await whatsAppTemplateService.getTemplateById(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: template };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ whatsAppTemplateService, ctx, body, set }) => {
      set.status = 201;
      const template = await whatsAppTemplateService.createTemplate(
        ctx as RequestContext,
        body
      );
      return { success: true, data: template };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        content: t.String({ minLength: 5 }),
        isDefault: t.Optional(t.Boolean()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ whatsAppTemplateService, ctx, params, body }) => {
      const template = await whatsAppTemplateService.updateTemplate(
        ctx as RequestContext,
        params.id,
        body
      );
      return { success: true, data: template };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        content: t.Optional(t.String({ minLength: 5 })),
        isDefault: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ whatsAppTemplateService, ctx, params, set }) => {
      await whatsAppTemplateService.deleteTemplate(
        ctx as RequestContext,
        params.id
      );
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
