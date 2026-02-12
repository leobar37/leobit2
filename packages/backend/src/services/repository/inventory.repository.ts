import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { inventory, type Inventory, type NewInventory } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class InventoryRepository {
  async findMany(ctx: RequestContext): Promise<Inventory[]> {
    return db.query.inventory.findMany({
      with: {
        product: true,
      },
      orderBy: desc(inventory.updatedAt),
    });
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<Inventory | undefined> {
    return db.query.inventory.findFirst({
      where: eq(inventory.id, id),
      with: {
        product: true,
      },
    });
  }

  async findByProductId(
    ctx: RequestContext,
    productId: string
  ): Promise<Inventory | undefined> {
    return db.query.inventory.findFirst({
      where: eq(inventory.productId, productId),
      with: {
        product: true,
      },
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewInventory, "id" | "updatedAt">
  ): Promise<Inventory> {
    const [item] = await db.insert(inventory).values(data).returning();
    return item;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewInventory, "id" | "updatedAt">>
  ): Promise<Inventory | undefined> {
    const [item] = await db
      .update(inventory)
      .set({
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, id))
      .returning();

    return item;
  }

  async updateQuantity(
    ctx: RequestContext,
    productId: string,
    quantity: string
  ): Promise<Inventory | undefined> {
    const existing = await this.findByProductId(ctx, productId);

    if (existing) {
      const [item] = await db
        .update(inventory)
        .set({
          quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, existing.id))
        .returning();
      return item;
    }

    return this.create(ctx, {
      productId,
      quantity,
    });
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async count(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventory);

    return result[0]?.count ?? 0;
  }
}
