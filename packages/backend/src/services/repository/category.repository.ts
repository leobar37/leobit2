/**
 * Category Repository
 * Data access layer for product categories
 */
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  productCategories,
  type NewProductCategory,
  type ProductCategory,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class CategoryRepository {
  async findAll(ctx: RequestContext): Promise<ProductCategory[]> {
    return db.query.productCategories.findMany({
      where: eq(productCategories.businessId, ctx.businessId),
      orderBy: desc(productCategories.createdAt),
    });
  }

  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<ProductCategory | undefined> {
    const executor = tx ?? db;
    return executor.query.productCategories.findFirst({
      where: and(
        eq(productCategories.id, id),
        eq(productCategories.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewProductCategory, "businessId" | "id" | "createdAt" | "updatedAt">,
    tx?: DbTransaction
  ): Promise<ProductCategory> {
    const executor = tx ?? db;
    const [category] = await executor
      .insert(productCategories)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return category;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewProductCategory, "businessId" | "id" | "createdAt" | "updatedAt">>,
    tx?: DbTransaction
  ): Promise<ProductCategory | undefined> {
    const executor = tx ?? db;
    const [category] = await executor
      .update(productCategories)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productCategories.id, id),
          eq(productCategories.businessId, ctx.businessId)
        )
      )
      .returning();

    return category;
  }

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.id, id),
          eq(productCategories.businessId, ctx.businessId)
        )
      );
  }

  async count(
    ctx: RequestContext,
    filters?: {
      name?: string;
      excludeId?: string;
    },
    tx?: DbTransaction
  ): Promise<number> {
    const executor = tx ?? db;
    const result = await executor
      .select({ count: sql<number>`count(*)` })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.businessId, ctx.businessId),
          filters?.name
            ? sql`lower(${productCategories.name}) = lower(${filters.name})`
            : undefined,
          filters?.excludeId ? ne(productCategories.id, filters.excludeId) : undefined
        )
      );

    return result[0]?.count ?? 0;
  }
}
