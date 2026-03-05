import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import { inventory, type Inventory, type NewInventory, sales, saleItems, products, productVariants } from "../../db/schema";
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

  async getMissingInventoryReport(
    ctx: RequestContext,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<Array<{
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    totalSold: string;
    currentStock: string;
    needed: string;
  }>> {
    // Subquery: total sold per product/variant
    const soldSubquery = db
      .select({
        productId: saleItems.productId,
        variantId: saleItems.variantId,
        totalSold: sql<string>`sum(${saleItems.quantity})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          eq(sales.businessId, ctx.businessId),
          filters?.startDate ? gte(sales.saleDate, filters.startDate) : undefined,
          filters?.endDate ? lte(sales.saleDate, filters.endDate) : undefined
        )
      )
      .groupBy(saleItems.productId, saleItems.variantId)
      .as("sold");

    // Main query: products with sold quantities and inventory
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        variantId: productVariants.id,
        variantName: productVariants.name,
        totalSold: sql<string>`coalesce(${soldSubquery.totalSold}, '0')`,
        currentStock: sql<string>`coalesce(${inventory.quantity}, '0')`,
        needed: sql<string>`greatest(coalesce(${soldSubquery.totalSold}, '0')::decimal - coalesce(${inventory.quantity}, '0')::decimal, 0)`,
      })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .leftJoin(
        soldSubquery,
        and(
          eq(soldSubquery.productId, products.id),
          eq(soldSubquery.variantId, productVariants.id)
        )
      )
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(eq(products.businessId, ctx.businessId))
      .orderBy(desc(sql`needed`));

    return result;
  }
}
