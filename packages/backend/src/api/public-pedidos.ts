import { Elysia, t } from "elysia";
import { servicesPlugin } from "../plugins/services";
import { db } from "../lib/db";
import { orderTokens } from "../db/schema/order-tokens";
import { orders } from "../db/schema/orders";
import { eq, and } from "drizzle-orm";
import { RequestContext } from "../context/request-context";
import { defaultCalculatorSettings } from "../db/schema/businesses";

async function getPublicContext(token: string): Promise<{ ctx: RequestContext; orderId: string }> {
  const tokenRecord = await db
    .select({
      token: orderTokens,
      businessId: orders.businessId,
    })
    .from(orderTokens)
    .innerJoin(orders, eq(orders.id, orderTokens.orderId))
    .where(and(eq(orderTokens.token, token), eq(orderTokens.isActive, true)));

  if (!tokenRecord.length || !tokenRecord[0]) {
    throw new Error("Token inválido o expirado");
  }

  const { token: tokenData, businessId } = tokenRecord[0];

  if (!tokenData.isActive) {
    throw new Error("Token inactivo");
  }

  const ctx = new RequestContext(
    "",
    "",
    "Public",
    businessId ?? "",
    "",
    "VENDEDOR",
    null,
    [],
    false,
    true,
    defaultCalculatorSettings
  );

  return { ctx, orderId: tokenData.orderId };
}

export const publicPedidoRoutes = new Elysia({ prefix: "/public/pedido" })
  .use(servicesPlugin)
  .post(
    "/:token/confirmar",
    async ({ params, body, orderService, set }) => {
      const { ctx, orderId } = await getPublicContext(params.token);

      const result = await orderService.confirmWithToken(ctx, params.token, {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        deliveryDate: body.deliveryDate,
        notes: body.notes,
      });

      set.status = 200;
      return {
        success: true,
        data: {
          orderId: result.id,
          status: result.status,
          deliveryDate: result.deliveryDate,
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
      body: t.Object({
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        deliveryDate: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  );
