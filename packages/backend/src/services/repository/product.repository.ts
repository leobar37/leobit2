// @ts-nocheck - Backend file
import { eq, and, desc, like, isNull, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  products,
  productCategories,
  productVariants,
  type NewProduct,
  type Product,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface ProductCategorySummary {
  id: string;
  name: string;
  color: string;
}

export interface ProductRecord extends Omit<Product, "type"> {
  hasVariants: boolean;
  category: ProductCategorySummary | null;
}

type ProductRow = {
  id: string;
  businessId: string;
  name: string;
  categoryId: string | null;
  unit: Product["unit"];
  basePrice: string;
  costPrice: string;
  isActive: boolean;
  imageId: string | null;
  hasVariants: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
  variantCount?: number;
};

export class ProductRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      search?: string;
      categoryId?: string;
      uncategorized?: boolean;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProductRecord[]> {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    const productsWithVariants = await db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        categoryId: products.categoryId,
        unit: products.unit,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        isActive: products.isActive,
        imageId: products.imageId,
        hasVariants: products.hasVariants,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        variantCount: sql<number>`count(${productVariants.id})`,
        categoryName: productCategories.name,
        categoryColor: productCategories.color,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .where(and(
        eq(products.businessId, ctx.businessId),
        filters?.categoryId ? eq(products.categoryId, filters.categoryId) : undefined,
        filters?.uncategorized === true ? isNull(products.categoryId) : undefined,
        filters?.isActive !== undefined ? eq(products.isActive, filters.isActive) : undefined,
        filters?.search ? like(products.name, `%${filters.search}%`) : undefined
      ))
      .groupBy(
        products.id,
        productCategories.id,
        productCategories.name,
        productCategories.color
      )
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return productsWithVariants.map((product) => this.mapProductRow(product));
  }

  async findById(ctx: RequestContext, id: string): Promise<ProductRecord | undefined> {
    return this.findByIdWithExecutor(ctx, id, db);
  }

  private async findByIdWithExecutor(
    ctx: RequestContext,
    id: string,
    executor: DbTransaction | typeof db
  ): Promise<ProductRecord | undefined> {
    const [product] = await executor
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        categoryId: products.categoryId,
        unit: products.unit,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        isActive: products.isActive,
        imageId: products.imageId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        hasVariants: products.hasVariants,
        categoryName: productCategories.name,
        categoryColor: productCategories.color,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ))
      .limit(1);

    if (!product) return undefined;

    return this.mapProductRow(product);
  }

  async findByName(ctx: RequestContext, name: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.name, name),
        eq(products.businessId, ctx.businessId)
      ))
      .limit(1);

    return product;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewProduct, "id" | "createdAt" | "businessId"> & { id?: string },
    tx?: DbTransaction
  ): Promise<ProductRecord> {
    const dbOrTx = tx || db;
    const [product] = await dbOrTx
      .insert(products)
      .values({
        ...(data.id ? { id: data.id } : {}),
        name: data.name,
        type: data.type,
        categoryId: data.categoryId,
        unit: data.unit,
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        isActive: data.isActive,
        imageId: data.imageId,
        businessId: ctx.businessId,
        hasVariants: data.hasVariants,
      })
      .returning();

    const createdProduct = await this.findByIdWithExecutor(ctx, product.id, dbOrTx);

    if (!createdProduct) {
      throw new Error("Created product could not be reloaded");
    }

    return createdProduct;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewProduct, "id" | "createdAt" | "businessId">>,
    tx?: DbTransaction
  ): Promise<ProductRecord | undefined> {
    const dbOrTx = tx || db;
    const [product] = await dbOrTx
      .update(products)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.imageId !== undefined && { imageId: data.imageId }),
        ...(data.hasVariants !== undefined && { hasVariants: data.hasVariants }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ))
      .returning();

    if (!product) {
      return undefined;
    }

    return this.findByIdWithExecutor(ctx, product.id, dbOrTx);
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(products)
      .where(and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ));
  }

  async count(
    ctx: RequestContext,
    filters?: { categoryId?: string; uncategorized?: boolean; isActive?: boolean }
  ): Promise<number> {
    const conditions = [
      eq(products.businessId, ctx.businessId),
      filters?.categoryId ? eq(products.categoryId, filters.categoryId) : undefined,
      filters?.uncategorized === true ? isNull(products.categoryId) : undefined,
      filters?.isActive !== undefined ? eq(products.isActive, filters.isActive) : undefined,
    ];

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions.filter(Boolean)));

    return result[0]?.count ?? 0;
  }

  private mapProductRow(product: ProductRow): ProductRecord {
    return {
      id: product.id,
      businessId: product.businessId,
      name: product.name,
      categoryId: product.categoryId,
      unit: product.unit,
      basePrice: product.basePrice,
      costPrice: product.costPrice,
      isActive: product.isActive,
      imageId: product.imageId,
      hasVariants: product.hasVariants ?? (product.variantCount ?? 0) > 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category:
        product.categoryId && product.categoryName && product.categoryColor
          ? {
              id: product.categoryId,
              name: product.categoryName,
              color: product.categoryColor,
            }
          : null,
    };
  }
}
