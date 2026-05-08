import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const cocheraSessionRoutes = new Elysia({ prefix: "/cochera/sessions" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ cocheraSessionService, ctx, query }) => {
      const search = query.search?.toString();
      const sessions = await cocheraSessionService.listActive(ctx as RequestContext, {
        search,
      });
      return {
        success: true,
        data: sessions,
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ cocheraSessionService, ctx, body }) => {
      const session = await cocheraSessionService.create(
        ctx as RequestContext,
        body
      );
      return {
        success: true,
        data: session,
      };
    },
    {
      body: t.Object({
        plate: t.String({ minLength: 1, maxLength: 20 }),
        vehicleType: t.Union([
          t.Literal("auto"),
          t.Literal("moto"),
          t.Literal("camioneta"),
        ]),
        notes: t.Optional(t.String({ maxLength: 500 })),
      }),
    }
  )
  .get(
    "/:id",
    async ({ cocheraSessionService, ctx, params }) => {
      const session = await cocheraSessionService.findById(
        ctx as RequestContext,
        params.id
      );
      return {
        success: true,
        data: session,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/checkout",
    async ({ cocheraCheckoutService, ctx, params, body }) => {
      const result = await cocheraCheckoutService.checkout(
        ctx as RequestContext,
        params.id,
        body
      );
      return {
        success: true,
        data: result,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        paymentMode: t.Optional(t.Union([
          t.Literal("pago_total"),
          t.Literal("a_cuenta"),
          t.Literal("debe_todo"),
        ])),
        amountPaid: t.Optional(t.Number({ minimum: 0 })),
        paymentMethod: t.Optional(t.Union([
          t.Literal("efectivo"),
          t.Literal("yape"),
          t.Literal("plin"),
        ])),
        responsibleCustomerId: t.Optional(t.Nullable(t.String())),
        responsibleName: t.Optional(t.Nullable(t.String({ maxLength: 160 }))),
        responsiblePhone: t.Optional(t.Nullable(t.String({ maxLength: 40 }))),
        notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
        discount: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  );
