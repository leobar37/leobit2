import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ paymentService, ctx, query }) => {
      const payments = await paymentService.getPayments(ctx as RequestContext, {
        clientId: query.clientId,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: payments };
    },
    {
      query: t.Object({
        clientId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ paymentService, ctx, params }) => {
      const payment = await paymentService.getPayment(ctx as RequestContext, params.id);
      return { success: true, data: payment };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ paymentService, ctx, body, set }) => {
      set.status = 201;
      const payment = await paymentService.createPayment(ctx as RequestContext, {
        ...body,
        amount: parseFloat(body.amount),
      });
      return { success: true, data: payment };
    },
    {
      body: t.Object({
        clientId: t.String(),
        amount: t.String(),
        paymentMethod: t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
        ]),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ paymentService, ctx, params, set }) => {
      await paymentService.deletePayment(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/proof",
    async ({ paymentService, fileService, ctx, params, body }) => {
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

      // Upload file using FileService
      const fileRecord = await fileService.upload(ctx as RequestContext, file);

      // Update payment with file ID
      const updatedPayment = await paymentService.updatePaymentProof(
        ctx as RequestContext,
        params.id,
        { proofImageId: fileRecord.id }
      );

      return {
        success: true,
        data: { ...updatedPayment, proofImageId: fileRecord.id },
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
  .put(
    "/:id/reference",
    async ({ paymentService, ctx, params, body }) => {
      const updatedPayment = await paymentService.updatePaymentProof(
        ctx as RequestContext,
        params.id,
        { referenceNumber: body.referenceNumber }
      );

      return {
        success: true,
        data: updatedPayment,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        referenceNumber: t.String({ maxLength: 50 }),
      }),
    }
  );
