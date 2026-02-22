import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { products, type Product, type NewProduct } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

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
  ): Promise<Product[]> {
    return db.query.products.findMany({
      where: and(
        eq(products.businessId, ctx.businessId),
        filters?.type ? eq(products.type, filters.type) : undefined,
        filters?.isActive !== undefined ? eq(products.isActive, filters.isActive) : undefined,
        filters?.search ? like(products.name, `%${filters.search}%`) : undefined
      ),
      orderBy: desc(products.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Product | undefined> {
    return db.query.products.findFirst({
      where: and(
        eq(products.id, id),
        eq(products.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewProduct, "id" | "createdAt" | "businessId">
  ): Promise<Product> {
    const [product] = await db
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
    data: Partial<Omit<NewProduct, "id" | "createdAt" | "businessId">>
  ): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
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
