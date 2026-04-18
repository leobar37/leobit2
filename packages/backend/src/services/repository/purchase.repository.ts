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
import type { DbTransaction } from "../../lib/txid";

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export interface CreatePurchaseInput {
  id?: string;
  supplierId?: string | null;
  purchaseDate?: string;
  status?: "draft" | "pending" | "received" | "cancelled";
  totalAmount?: string;
  notes?: string;
  receiptImageId?: string | null;
  invoiceNumber?: string | null;
  syncGroupId?: string | null;
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
    id: string,
    tx?: DbTransaction
  ): Promise<PurchaseWithItems | undefined> {
    const dbOrTx = tx || db;
    const purchase = await dbOrTx.query.purchases.findFirst({
      where: and(
        eq(purchases.id, id),
        eq(purchases.businessId, ctx.businessId)
      ),
      with: {
        supplier: true,
        receiptImage: true,
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
    data: CreatePurchaseInput,
    items: Omit<NewPurchaseItem, "purchaseId" | "id" | "createdAt" | "businessId" | "updatedAt">[],
    tx?: DbTransaction
  ): Promise<PurchaseWithItems> {
    const executeCreate = async (dbOrTx: DbTransaction) => {
      const insertValues = {
        ...(data.id ? { id: data.id } : {}),
        supplierId: data.supplierId ?? null,
        purchaseDate: data.purchaseDate ?? null,
        status: data.status ?? "draft",
        totalAmount: data.totalAmount ?? "0",
        notes: data.notes ?? null,
        receiptImageId: data.receiptImageId ?? null,
        invoiceNumber: data.invoiceNumber ?? null,
        businessId: ctx.businessId,
        syncGroupId: data.syncGroupId ?? null,
      };
      try {
        const [purchase] = await dbOrTx
          .insert(purchases)
          .values(insertValues)
          .returning();
        const insertedItems: PurchaseItem[] = [];
        for (const item of items) {
          const [insertedItem] = await dbOrTx
            .insert(purchaseItems)
            .values({
              ...item,
              purchaseId: purchase.id,
              businessId: ctx.businessId,
            })
            .returning();
          insertedItems.push(insertedItem);
        }
        return {
          ...purchase,
          items: insertedItems,
        };
      } catch (err) {
        const pgErr = (err as any);
        console.error("[PurchaseRepo] DB ERROR:", {
          message: pgErr.message,
          code: pgErr.code,
          detail: pgErr.detail,
          routine: pgErr.routine,
          table: pgErr.table,
          constraint: pgErr.constraint,
        });
        throw err;
      }
    };

    if (tx) {
      return executeCreate(tx);
    }

    return db.transaction(async (innerTx) => executeCreate(innerTx));
  }

  async updateStatus(
    ctx: RequestContext,
    id: string,
    status: "draft" | "pending" | "received" | "cancelled",
    tx?: DbTransaction
  ): Promise<Purchase | undefined> {
    const dbOrTx = tx || db;
    const [purchase] = await dbOrTx
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

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const dbOrTx = tx || db;

    await dbOrTx
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

  async addItem(
    ctx: RequestContext,
    purchaseId: string,
    item: {
      id?: string;
      productId: string;
      variantId?: string | null;
      unitId?: string | null;
      quantity: string;
      unitCost: string;
      totalCost: string;
    },
    tx?: DbTransaction
  ): Promise<PurchaseItem> {
    const dbOrTx = tx || db;

    const [insertedItem] = await dbOrTx
      .insert(purchaseItems)
      .values({
        ...(item.id ? { id: item.id } : {}),
        purchaseId,
        businessId: ctx.businessId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        unitId: item.unitId ?? null,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      })
      .returning();

    return insertedItem;
  }

  async findItemById(
    ctx: RequestContext,
    purchaseId: string,
    itemId: string,
    tx?: DbTransaction
  ): Promise<PurchaseItem | undefined> {
    const dbOrTx = tx || db;

    const [item] = await dbOrTx
      .select()
      .from(purchaseItems)
      .where(
        and(
          eq(purchaseItems.id, itemId),
          eq(purchaseItems.purchaseId, purchaseId),
          eq(purchaseItems.businessId, ctx.businessId)
        )
      );

    return item;
  }

  async updateItem(
    ctx: RequestContext,
    purchaseId: string,
    itemId: string,
    data: {
      quantity?: string;
      unitCost?: string;
      totalCost?: string;
    },
    tx?: DbTransaction
  ): Promise<PurchaseItem> {
    const dbOrTx = tx || db;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }
    if (data.unitCost !== undefined) {
      updateData.unitCost = data.unitCost;
    }
    if (data.totalCost !== undefined) {
      updateData.totalCost = data.totalCost;
    }

    const [item] = await dbOrTx
      .update(purchaseItems)
      .set(updateData)
      .where(
        and(
          eq(purchaseItems.id, itemId),
          eq(purchaseItems.purchaseId, purchaseId),
          eq(purchaseItems.businessId, ctx.businessId)
        )
      )
      .returning();

    return item;
  }

  async deleteItem(
    ctx: RequestContext,
    purchaseId: string,
    itemId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const dbOrTx = tx || db;

    await dbOrTx
      .delete(purchaseItems)
      .where(
        and(
          eq(purchaseItems.id, itemId),
          eq(purchaseItems.purchaseId, purchaseId),
          eq(purchaseItems.businessId, ctx.businessId)
        )
      );
  }

  async updateTotal(
    ctx: RequestContext,
    purchaseId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const dbOrTx = tx || db;

    const items = await dbOrTx
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));

    const total = items.reduce((sum, item) => {
      return sum + parseFloat(item.totalCost || "0");
    }, 0);

    await dbOrTx
      .update(purchases)
      .set({
        totalAmount: total.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(purchases.id, purchaseId));
  }
}
