import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { orderTokens, type OrderToken, type NewOrderToken } from "../../db/schema/order-tokens";
import { orders } from "../../db/schema/orders";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderTokenRepository {
  async findById(ctx: RequestContext, id: string): Promise<OrderToken | undefined> {
    const result = await db
      .select({
        token: orderTokens,
      })
      .from(orderTokens)
      .innerJoin(orders, eq(orders.id, orderTokens.orderId))
      .where(
        and(
          eq(orderTokens.id, id),
          eq(orders.businessId, ctx.businessId)
        )
      );

    return result[0]?.token;
  }

  async findByToken(ctx: RequestContext, token: string): Promise<OrderToken | undefined> {
    const result = await db
      .select({
        token: orderTokens,
      })
      .from(orderTokens)
      .innerJoin(orders, eq(orders.id, orderTokens.orderId))
      .where(
        and(
          eq(orderTokens.token, token),
          eq(orders.businessId, ctx.businessId)
        )
      );

    return result[0]?.token;
  }

  /**
   * Find token by token string without businessId filter - for public routes
   */
  async findByTokenPublic(token: string): Promise<(OrderToken & { order: { id: string; status: string; businessId: string } }) | undefined> {
    const result = await db
      .select({
        token: orderTokens,
        orderId: orders.id,
        orderStatus: orders.status,
        orderBusinessId: orders.businessId,
      })
      .from(orderTokens)
      .innerJoin(orders, eq(orders.id, orderTokens.orderId))
      .where(eq(orderTokens.token, token));

    if (!result[0]) return undefined;
    
    return {
      ...result[0].token,
      order: {
        id: result[0].orderId,
        status: result[0].orderStatus,
        businessId: result[0].orderBusinessId,
      },
    };
  }

  async findByOrderId(ctx: RequestContext, orderId: string): Promise<OrderToken | undefined> {
    const result = await db
      .select({
        token: orderTokens,
      })
      .from(orderTokens)
      .innerJoin(orders, eq(orders.id, orderTokens.orderId))
      .where(
        and(
          eq(orderTokens.orderId, orderId),
          eq(orders.businessId, ctx.businessId)
        )
      );

    return result[0]?.token;
  }

  async create(
    ctx: RequestContext,
    data: Pick<NewOrderToken, "orderId" | "token">,
    tx?: DbTransaction
  ): Promise<OrderToken> {
    const executor = tx ?? db;

    const [created] = await executor
      .insert(orderTokens)
      .values({
        orderId: data.orderId,
        token: data.token,
        isActive: true,
      })
      .returning();

    return created;
  }

  async updateStatus(
    ctx: RequestContext,
    id: string,
    isActive: boolean,
    tx?: DbTransaction
  ): Promise<OrderToken | undefined> {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(orderTokens)
      .set({ isActive })
      .where(eq(orderTokens.id, id))
      .returning();

    return updated;
  }

  async markUsed(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<OrderToken | undefined> {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(orderTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(orderTokens.id, id))
      .returning();

    return updated;
  }

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(orderTokens).where(eq(orderTokens.id, id));
  }

  async deleteByOrderId(ctx: RequestContext, orderId: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(orderTokens).where(eq(orderTokens.orderId, orderId));
  }
}
