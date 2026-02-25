import { and, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { orderEvents, type NewOrderEvent, type OrderEvent } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderEventsRepository {
  async create(
    ctx: RequestContext,
    data: Omit<NewOrderEvent, "id" | "createdAt">,
    tx?: DbTransaction
  ): Promise<OrderEvent> {
    const executor = tx ?? db;
    const [created] = await executor
      .insert(orderEvents)
      .values({
        ...data,
        createdByBusinessUserId: data.createdByBusinessUserId ?? ctx.businessUserId,
      })
      .returning();

    return created;
  }

  async findByOrderId(ctx: RequestContext, orderId: string): Promise<OrderEvent[]> {
    return db.query.orderEvents.findMany({
      where: and(eq(orderEvents.orderId, orderId)),
      orderBy: desc(orderEvents.createdAt),
    });
  }

  async findByClientEventId(
    ctx: RequestContext,
    clientEventId: string
  ): Promise<OrderEvent | undefined> {
    return db.query.orderEvents.findFirst({
      where: eq(orderEvents.clientEventId, clientEventId),
    });
  }
}
