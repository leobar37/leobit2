import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { products, productVariants, type Product, type NewProduct } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface ProductWithVariants extends Product {
  hasVariants: boolean;
}

export class ProductRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      search?: string;
      type?: "pollo" | "huevo" | "otro";
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProductWithVariants[]> {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    const productsWithVariants = await db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        isActive: products.isActive,
        imageId: products.imageId,
        syncStatus: products.syncStatus,
        syncAttempts: products.syncAttempts,
        createdAt: products.createdAt,
        variantCount: sql<number>`count(${productVariants.id})`,
      })
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .where(and(
        eq(products.businessId, ctx.businessId),
        filters?.type ? eq(products.type, filters.type) : undefined,
        filters?.isActive !== undefined ? eq(products.isActive, filters.isActive) : undefined,
        filters?.search ? like(products.name, `%${filters.search}%`) : undefined
      ))
      .groupBy(products.id)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return productsWithVariants.map(p => ({
      ...p,
      hasVariants: (p.variantCount ?? 0) > 0,
    }));
  }

  async findById(ctx: RequestContext, id: string): Promise<ProductWithVariants | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        isActive: products.isActive,
        imageId: products.imageId,
        syncStatus: products.syncStatus,
        syncAttempts: products.syncAttempts,
        createdAt: products.createdAt,
        variantCount: sql<number>`count(${productVariants.id})`,
      })
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ))
      .groupBy(products.id)
      .limit(1);

    if (!product) return undefined;

    return {
      ...product,
      hasVariants: (product.variantCount ?? 0) > 0,
    };
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewProduct, "id" | "createdAt" | "businessId">,
    tx?: DbTransaction
  ): Promise<Product> {
    const dbOrTx = tx || db;
    const [product] = await dbOrTx
      .insert(products)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return product;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewProduct, "id" | "createdAt" | "businessId">>,
    tx?: DbTransaction
  ): Promise<Product | undefined> {
    const dbOrTx = tx || db;
    const [product] = await dbOrTx
      .update(products)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.imageId !== undefined && { imageId: data.imageId }),
      })
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ))
      .returning();

    return product;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(products)
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext, filters?: { type?: "pollo" | "huevo" | "otro"; isActive?: boolean }): Promise<number> {
    const conditions = [
      eq(products.businessId, ctx.businessId),
      filters?.type ? eq(products.type, filters.type) : undefined,
      filters?.isActive !== undefined ? eq(products.isActive, filters.isActive) : undefined,
    ];

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions.filter(Boolean)));

    return result[0]?.count ?? 0;
  }
}
