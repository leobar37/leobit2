import { Elysia, t } from "elysia";
import { contextPlugin } from "../../plugins/context";
import { servicesPlugin } from "../../plugins/services";
import type { RequestContext } from "../../context/request-context";

export const whatsAppMessageRoutes = new Elysia({ prefix: "/whatsapp" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/send",
    async ({ whatsAppMessageService, ctx, body }) => {
      const message = await whatsAppMessageService.sendMessage(
        ctx as RequestContext,
        {
          customerId: body.customerId,
          templateId: body.templateId,
          variables: body.variables,
          saleId: body.saleId,
        }
      );
      return { success: true, data: message };
    },
    {
      body: t.Object({
        customerId: t.String(),
        templateId: t.String(),
        variables: t.Optional(
          t.Record(t.String(), t.Union([t.String(), t.Number()]))
        ),
        saleId: t.Optional(t.String()),
      }),
      detail: {
        summary: "Send WhatsApp message to customer",
        tags: ["WhatsApp"],
      },
    }
  )
  .post(
    "/send-bulk",
    async ({ whatsAppMessageService, ctx, body }) => {
      const messages = await whatsAppMessageService.sendBulkMessages(
        ctx as RequestContext,
        {
          customerIds: body.customerIds,
          templateId: body.templateId,
          variables: body.variables,
        }
      );
      return { success: true, data: messages };
    },
    {
      body: t.Object({
        customerIds: t.Array(t.String()),
        templateId: t.String(),
        variables: t.Optional(
          t.Record(t.String(), t.Record(t.String(), t.Union([t.String(), t.Number()])))
        ),
      }),
      detail: {
        summary: "Send bulk WhatsApp messages",
        tags: ["WhatsApp"],
      },
    }
  )
  .get(
    "/messages",
    async ({ whatsAppMessageService, ctx, query }) => {
      const { messages, total } = await whatsAppMessageService.getMessages(
        ctx as RequestContext,
        {
          status: query.status,
          customerId: query.customerId,
          search: query.search,
          dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
          dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined,
        }
      );
      return { success: true, data: messages, meta: { total } };
    },
    {
      query: t.Object({
        status: t.Optional(t.Union([t.Literal("enviado"), t.Literal("fallido")])),
        customerId: t.Optional(t.String()),
        search: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get WhatsApp message history",
        tags: ["WhatsApp"],
      },
    }
  )
  .get(
    "/messages/stats",
    async ({ whatsAppMessageService, ctx }) => {
      const stats = await whatsAppMessageService.getStats(ctx as RequestContext);
      return { success: true, data: stats };
    },
    {
      detail: {
        summary: "Get WhatsApp message statistics",
        tags: ["WhatsApp"],
      },
    }
  )
  .post(
    "/messages/:id/retry",
    async ({ whatsAppMessageService, ctx, params }) => {
      const message = await whatsAppMessageService.retryMessage(
        ctx as RequestContext,
        params.id
      );
      return { success: true, data: message };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Retry failed WhatsApp message",
        tags: ["WhatsApp"],
      },
    }
  );
