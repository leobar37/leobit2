import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const expenseRoutes = new Elysia({ prefix: "/expenses" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ expenseService, ctx, query }) => {
      const expenses = await expenseService.getExpenses(ctx as RequestContext, {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        categoryId: query.categoryId,
        distribucionId: query.distribucionId,
        sellerId: query.sellerId,
        paymentMethod: query.paymentMethod,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: expenses };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        distribucionId: t.Optional(t.String()),
        sellerId: t.Optional(t.String()),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
          t.Literal("tarjeta"),
          t.Literal("saldo"),
        ])),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ expenseService, ctx, params }) => {
      const expense = await expenseService.getExpense(ctx as RequestContext, params.id);
      return { success: true, data: expense };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/by-distribucion/:distribucionId",
    async ({ expenseService, ctx, params }) => {
      const expenses = await expenseService.getExpensesByDistribucion(
        ctx as RequestContext,
        params.distribucionId
      );
      return { success: true, data: expenses };
    },
    {
      params: t.Object({
        distribucionId: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ expenseService, ctx, body, set }) => {
      set.status = 201;
      const result = await expenseService.createExpense(ctx as RequestContext, {
        id: body.id,
        categoryId: body.categoryId,
        distribucionId: body.distribucionId,
        sellerId: body.sellerId,
        amount: body.amount,
        description: body.description,
        expenseDate: body.expenseDate,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber,
        receiptImageId: body.receiptImageId,
      });
      return { success: true, data: result.data };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        categoryId: t.String(),
        distribucionId: t.Optional(t.String()),
        sellerId: t.Optional(t.String()),
        amount: t.Number({ minimum: 0.01 }),
        description: t.Optional(t.String()),
        expenseDate: t.String(),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
          t.Literal("tarjeta"),
          t.Literal("saldo"),
        ])),
        referenceNumber: t.Optional(t.String({ maxLength: 50 })),
        receiptImageId: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ expenseService, ctx, params, body }) => {
      const result = await expenseService.updateExpense(ctx as RequestContext, params.id, {
        categoryId: body.categoryId,
        distribucionId: body.distribucionId,
        sellerId: body.sellerId,
        amount: body.amount,
        description: body.description,
        expenseDate: body.expenseDate,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber,
        receiptImageId: body.receiptImageId,
      });
      return { success: true, data: result.data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        categoryId: t.Optional(t.String()),
        distribucionId: t.Optional(t.Union([t.String(), t.Null()])),
        sellerId: t.Optional(t.Union([t.String(), t.Null()])),
        amount: t.Optional(t.Number({ minimum: 0.01 })),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        expenseDate: t.Optional(t.String()),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
          t.Literal("transferencia"),
          t.Literal("tarjeta"),
          t.Literal("saldo"),
        ])),
        referenceNumber: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
        receiptImageId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ expenseService, ctx, params, set }) => {
      await expenseService.deleteExpense(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/receipt",
    async ({ expenseService, fileService, ctx, params, body }) => {
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

      // Update expense with file ID
      const result = await expenseService.updateReceiptImage(
        ctx as RequestContext,
        params.id,
        fileRecord.id
      );

      return {
        success: true,
        data: result.data,

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
