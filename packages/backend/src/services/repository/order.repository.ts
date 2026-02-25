import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  orderItems,
  orders,
  type Order,
  type OrderItem,
  type NewOrder,
  type NewOrderItem,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type OrderStatus = "draft" | "confirmed" | "cancelled" | "delivered";
export type OrderWithItems = Order & { items: OrderItem[] };

export interface CreateOrderInput {
  clientId: string;
  deliveryDate: string;
  orderDate: string;
  status?: OrderStatus;
  paymentIntent: "contado" | "credito";
  totalAmount: string;
  confirmedSnapshot?: Record<string, unknown>;
  deliveredSnapshot?: Record<string, unknown>;
  version?: number;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    orderedQuantity: string;
    deliveredQuantity?: string;
    unitPriceQuoted: string;
    unitPriceFinal?: string;
    isModified?: boolean;
    originalQuantity?: string;
  }>;
}

export interface UpdateOrderInput {
  deliveryDate?: string;
  status?: OrderStatus;
  paymentIntent?: "contado" | "credito";
  totalAmount?: string;
  confirmedSnapshot?: Record<string, unknown>;
  deliveredSnapshot?: Record<string, unknown>;
  version?: number;
  syncStatus?: "pending" | "synced" | "error";
  syncAttempts?: number;
}

export interface UpdateOrderItemInput {
  orderedQuantity?: string;
  deliveredQuantity?: string;
  unitPriceFinal?: string;
  isModified?: boolean;
  originalQuantity?: string;
}

export class OrderRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      deliveryDateFrom?: string;
      deliveryDateTo?: string;
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<OrderWithItems[]> {
    return db.query.orders.findMany({
      where: and(
        eq(orders.businessId, ctx.businessId),
        eq(orders.sellerId, ctx.businessUserId),
        filters?.deliveryDateFrom
          ? gte(orders.deliveryDate, filters.deliveryDateFrom)
          : undefined,
        filters?.deliveryDateTo
          ? lte(orders.deliveryDate, filters.deliveryDateTo)
          : undefined,
        filters?.status ? eq(orders.status, filters.status) : undefined
      ),
      orderBy: [desc(orders.deliveryDate), desc(orders.createdAt)],
      limit: filters?.limit,
      offset: filters?.offset,
      with: {
        items: true,
        client: true,
      },
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<OrderWithItems | undefined> {
    return db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.businessId, ctx.businessId)),
      with: {
        items: true,
        client: true,
      },
    });
  }

  async create(ctx: RequestContext, data: CreateOrderInput, tx?: DbTransaction): Promise<Order> {
    const { items, ...orderData } = data;
    const executor = tx ?? db;

    const [createdOrder] = await executor
      .insert(orders)
      .values({
        ...orderData,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
      })
      .returning();

    if (items.length > 0) {
      await executor.insert(orderItems).values(
        items.map((item) => ({
          ...item,
          orderId: createdOrder.id,
        }))
      );
    }

    return createdOrder;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: UpdateOrderInput,
    tx?: DbTransaction
  ): Promise<Order | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(orders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.businessId, ctx.businessId)))
      .returning();

    return updated;
  }

  async updateVersion(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    data: UpdateOrderInput,
    tx?: DbTransaction
  ): Promise<Order | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(orders)
      .set({
        ...data,
        version: baseVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, id),
          eq(orders.businessId, ctx.businessId),
          eq(orders.version, baseVersion)
        )
      )
      .returning();

    return updated;
  }

  async replaceItems(
    ctx: RequestContext,
    orderId: string,
    items: CreateOrderInput["items"],
    tx?: DbTransaction
  ): Promise<void> {
    const order = await this.findById(ctx, orderId);
    if (!order) {
      return;
    }

    const executor = tx ?? db;
    await executor.delete(orderItems).where(eq(orderItems.orderId, orderId));

    if (items.length > 0) {
      await executor.insert(orderItems).values(
        items.map((item) => ({
          ...item,
          orderId,
        }))
      );
    }
  }

  async findItemById(
    ctx: RequestContext,
    orderId: string,
    itemId: string
  ): Promise<OrderItem | undefined> {
    const order = await this.findById(ctx, orderId);
    if (!order) {
      return undefined;
    }

    return db.query.orderItems.findFirst({
      where: and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderId)
      ),
    });
  }

  async updateItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    data: UpdateOrderItemInput,
    tx?: DbTransaction
  ): Promise<OrderItem | undefined> {
    const order = await this.findById(ctx, orderId);
    if (!order) {
      return undefined;
    }

    const executor = tx ?? db;
    const [updated] = await executor
      .update(orderItems)
      .set(data)
      .where(
        and(
          eq(orderItems.id, itemId),
          eq(orderItems.orderId, orderId)
        )
      )
      .returning();

    return updated;
  }

  async count(
    ctx: RequestContext,
    filters?: { deliveryDateFrom?: string; deliveryDateTo?: string; status?: OrderStatus }
  ): Promise<number> {
    const result = await db
      .select({ count: db.$count(orders) })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, ctx.businessId),
          eq(orders.sellerId, ctx.businessUserId),
          filters?.deliveryDateFrom
            ? gte(orders.deliveryDate, filters.deliveryDateFrom)
            : undefined,
          filters?.deliveryDateTo ? lte(orders.deliveryDate, filters.deliveryDateTo) : undefined,
          filters?.status ? eq(orders.status, filters.status) : undefined
        )
      );

    return result[0]?.count ?? 0;
  }
}
