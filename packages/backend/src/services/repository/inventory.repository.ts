import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import { variantInventory, sales, saleItems, products, productVariants } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

/**
 * @deprecated Use ProductVariantRepository for variant inventory operations
 * This repository is kept only for getMissingInventoryReport
 */
export class InventoryRepository {
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

    // Main query: products with sold quantities and variant inventory
    // Only uses variantInventory (no product-level inventory)
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
}
