import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  purchases,
  purchaseItems,
  type Purchase,
  type NewPurchase,
  type PurchaseItem,
  type NewPurchaseItem,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export class PurchaseRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      supplierId?: string;
      status?: "pending" | "received" | "cancelled";
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Purchase[]> {
    const conditions = [eq(purchases.businessId, ctx.businessId)];

    if (filters?.supplierId) {
      conditions.push(eq(purchases.supplierId, filters.supplierId));
    }

    if (filters?.status) {
      conditions.push(
        eq(purchases.status, filters.status as "pending" | "received" | "cancelled")
      );
    }

    if (filters?.startDate) {
      conditions.push(gte(purchases.purchaseDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(purchases.purchaseDate, filters.endDate));
    }

    return db.query.purchases.findMany({
      where: and(...conditions),
      with: {
        supplier: true,
      },
      orderBy: desc(purchases.purchaseDate),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<PurchaseWithItems | undefined> {
    const purchase = await db.query.purchases.findFirst({
      where: and(
        eq(purchases.id, id),
        eq(purchases.businessId, ctx.businessId)
      ),
      with: {
        supplier: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return purchase as PurchaseWithItems | undefined;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewPurchase, "businessId" | "id" | "createdAt" | "updatedAt">,
    items: Omit<NewPurchaseItem, "purchaseId" | "id" | "createdAt">[]
  ): Promise<PurchaseWithItems> {
    return await db.transaction(async (tx) => {
      const [purchase] = await tx
        .insert(purchases)
        .values({
          ...data,
          businessId: ctx.businessId,
        })
        .returning();

      const insertedItems: PurchaseItem[] = [];

      for (const item of items) {
        const [insertedItem] = await tx
          .insert(purchaseItems)
          .values({
            ...item,
            purchaseId: purchase.id,
          })
          .returning();
        insertedItems.push(insertedItem);
      }

      return {
        ...purchase,
        items: insertedItems,
      };
    });
  }

  async updateStatus(
    ctx: RequestContext,
    id: string,
    status: "pending" | "received" | "cancelled"
  ): Promise<Purchase | undefined> {
    const [purchase] = await db
      .update(purchases)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(eq(purchases.id, id), eq(purchases.businessId, ctx.businessId))
      )
      .returning();

    return purchase;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(purchases)
      .where(
        and(eq(purchases.id, id), eq(purchases.businessId, ctx.businessId))
      );
  }

  async count(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchases)
      .where(eq(purchases.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }
}
