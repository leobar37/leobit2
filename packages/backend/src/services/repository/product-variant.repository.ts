// @ts-nocheck - Backend file
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import { productVariants, variantInventory, sales, saleItems, products, type ProductVariant, type NewProductVariant, type VariantInventory, type NewVariantInventory } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface CreateVariantInput {
  id?: string;
  productId: string;
  name: string;
  sku?: string | null;
  unitQuantity: string;
  price: string;
  costPrice?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  sku?: string | null;
  unitQuantity?: string;
  price?: string;
  costPrice?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export class ProductVariantRepository {
  async findByProduct(
    ctx: RequestContext,
    productId: string,
    filters?: {
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<ProductVariant[]> {
    return db.query.productVariants.findMany({
      where: and(
        eq(productVariants.productId, productId),
        filters?.includeInactive ? undefined : 
          filters?.isActive !== undefined ? eq(productVariants.isActive, filters.isActive) : 
          eq(productVariants.isActive, true)
      ),
      orderBy: [productVariants.sortOrder, desc(productVariants.createdAt)],
      with: {
        inventory: true,
      },
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<(ProductVariant & { inventory?: VariantInventory }) | undefined> {
    return db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
      with: {
        inventory: true,
      },
    });
  }

  async findByIdAndProduct(ctx: RequestContext, id: string, productId: string): Promise<ProductVariant | undefined> {
    return db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, id),
        eq(productVariants.productId, productId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: CreateVariantInput,
    tx?: DbTransaction
  ): Promise<ProductVariant> {
    const dbOrTx = tx || db;
    const [variant] = await dbOrTx
      .insert(productVariants)
      .values({
        ...(data.id ? { id: data.id } : {}),
        productId: data.productId,
        name: data.name,
        sku: data.sku,
        unitQuantity: data.unitQuantity,
        price: data.price,
        costPrice: data.costPrice ?? "0",
        businessId: ctx.businessId,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return variant;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: UpdateVariantInput,
    tx?: DbTransaction
  ): Promise<ProductVariant | undefined> {
    const dbOrTx = tx || db;
    const [variant] = await dbOrTx
      .update(productVariants)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unitQuantity !== undefined && { unitQuantity: data.unitQuantity }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, id))
      .returning();

    return variant;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(productVariants)
      .where(eq(productVariants.id, id));
  }

  async countByProduct(ctx: RequestContext, productId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    return result[0]?.count ?? 0;
  }

  async existsByName(ctx: RequestContext, productId: string, name: string, excludeId?: string): Promise<boolean> {
    const conditions = [
      eq(productVariants.productId, productId),
      eq(productVariants.name, name),
    ];

    if (excludeId) {
      conditions.push(sql`${productVariants.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productVariants)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }

  async reorder(ctx: RequestContext, productId: string, variantIds: string[]): Promise<void> {
    for (let i = 0; i < variantIds.length; i++) {
      await db
        .update(productVariants)
        .set({ sortOrder: i })
        .where(and(
          eq(productVariants.id, variantIds[i]),
          eq(productVariants.productId, productId)
        ));
    }
  }

  // Variant Inventory operations
  async getInventory(ctx: RequestContext, variantId: string): Promise<VariantInventory | undefined> {
    return db.query.variantInventory.findFirst({
      where: eq(variantInventory.variantId, variantId),
    });
  }

  async createInventory(
    ctx: RequestContext,
    data: { variantId: string; quantity?: string },
    tx?: DbTransaction
  ): Promise<VariantInventory> {
    const dbOrTx = tx || db;
    const [inventory] = await dbOrTx
      .insert(variantInventory)
      .values({
        variantId: data.variantId,
        quantity: data.quantity ?? "0",
        businessId: ctx.businessId,
      })
      .returning();

    return inventory;
  }

  async updateInventory(
    ctx: RequestContext,
    variantId: string,
    quantity: string,
    tx?: DbTransaction
  ): Promise<VariantInventory | undefined> {
    const dbOrTx = tx || db;
    const [inventory] = await dbOrTx
      .update(variantInventory)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(variantInventory.variantId, variantId))
      .returning();

    return inventory;
  }

  async adjustInventory(
    ctx: RequestContext,
    variantId: string,
    adjustment: number,
    tx?: DbTransaction
  ): Promise<VariantInventory | undefined> {
    const dbOrTx = tx || db;
    const current = await this.getInventory(ctx, variantId);
    if (!current) return undefined;

    const currentQty = parseFloat(current.quantity);
    const newQty = Math.max(0, currentQty + adjustment);

    return this.updateInventory(ctx, variantId, newQty.toString(), tx);
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

    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        variantId: productVariants.id,
        variantName: productVariants.name,
        totalSold: sql<string>`coalesce(${soldSubquery.totalSold}, '0')`,
        currentStock: sql<string>`coalesce(${variantInventory.quantity}, '0')`,
        needed: sql<string>`greatest(
          coalesce(${soldSubquery.totalSold}, '0')::decimal -
          coalesce(${variantInventory.quantity}, '0')::decimal,
          0
        )`,
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
      .leftJoin(variantInventory, eq(variantInventory.variantId, productVariants.id))
      .where(and(
        eq(products.businessId, ctx.businessId),
        eq(products.isActive, true)
      ))
      .orderBy(desc(sql`needed`));

    return result;
  }

  async getStockAlerts(ctx: RequestContext): Promise<Array<{
    variantId: string;
    productId: string;
    productName: string;
    variantName: string;
    currentStock: string;
    lowThreshold: string;
    criticalThreshold: string;
    alertType: "negative" | "critical" | "low";
    suggestedQuantity: string;
  }>> {
    const result = await db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.name,
        currentStock: sql<string>`coalesce(${variantInventory.quantity}, '0')`,
        lowThreshold: productVariants.lowStockThreshold,
        criticalThreshold: productVariants.criticalStockThreshold,
        alertType: sql<"negative" | "critical" | "low">`
          CASE
            WHEN coalesce(${variantInventory.quantity}, '0')::decimal < 0 THEN 'negative'
            WHEN coalesce(${variantInventory.quantity}, '0')::decimal <= ${productVariants.criticalStockThreshold}::decimal THEN 'critical'
            WHEN coalesce(${variantInventory.quantity}, '0')::decimal <= ${productVariants.lowStockThreshold}::decimal THEN 'low'
            ELSE 'low'
          END
        `,
        suggestedQuantity: sql<string>`
          CASE
            WHEN coalesce(${variantInventory.quantity}, '0')::decimal < 0 THEN
              greatest(0, ${productVariants.lowStockThreshold}::decimal - coalesce(${variantInventory.quantity}, '0')::decimal)
            WHEN coalesce(${variantInventory.quantity}, '0')::decimal <= ${productVariants.lowStockThreshold}::decimal THEN
              greatest(0, ${productVariants.lowStockThreshold}::decimal - coalesce(${variantInventory.quantity}, '0')::decimal)
            ELSE '0'
          END
        `,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(variantInventory, eq(variantInventory.variantId, productVariants.id))
      .where(and(
        eq(productVariants.businessId, ctx.businessId),
        eq(productVariants.isActive, true),
        eq(products.isActive, true),
        sql`coalesce(${variantInventory.quantity}, '0')::decimal <= ${productVariants.lowStockThreshold}::decimal`
      ))
      .orderBy(sql`
        CASE
          WHEN coalesce(${variantInventory.quantity}, '0')::decimal < 0 THEN 0
          WHEN coalesce(${variantInventory.quantity}, '0')::decimal <= ${productVariants.criticalStockThreshold}::decimal THEN 1
          ELSE 2
        END
      `);

    return result;
  }
}
