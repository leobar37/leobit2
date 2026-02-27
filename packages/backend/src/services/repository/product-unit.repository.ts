import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  productUnits,
  type ProductUnit,
  type NewProductUnit,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface CreateProductUnitInput {
  productId: string;
  variantId: string;
  name: string;
  displayName: string;
  baseUnitQuantity: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateProductUnitInput {
  name?: string;
  displayName?: string;
  baseUnitQuantity?: string;
  isActive?: boolean;
  sortOrder?: number;
  syncStatus?: "pending" | "synced" | "error";
  syncAttempts?: number;
}

export class ProductUnitRepository {
  async findByProduct(
    ctx: RequestContext,
    productId: string,
    filters?: {
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<ProductUnit[]> {
    return db.query.productUnits.findMany({
      where: and(
        eq(productUnits.productId, productId),
        eq(productUnits.businessId, ctx.businessId),
        filters?.includeInactive
          ? undefined
          : filters?.isActive !== undefined
            ? eq(productUnits.isActive, filters.isActive)
            : eq(productUnits.isActive, true)
      ),
      orderBy: [productUnits.sortOrder, desc(productUnits.createdAt)],
    });
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<ProductUnit | undefined> {
    return db.query.productUnits.findFirst({
      where: and(
        eq(productUnits.id, id),
        eq(productUnits.businessId, ctx.businessId)
      ),
    });
  }

  async findByIdAndProduct(
    ctx: RequestContext,
    id: string,
    productId: string
  ): Promise<ProductUnit | undefined> {
    return db.query.productUnits.findFirst({
      where: and(
        eq(productUnits.id, id),
        eq(productUnits.productId, productId),
        eq(productUnits.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: CreateProductUnitInput
  ): Promise<ProductUnit> {
    const [unit] = await db
      .insert(productUnits)
      .values({
        ...data,
        businessId: ctx.businessId,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return unit;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: UpdateProductUnitInput
  ): Promise<ProductUnit | undefined> {
    const [unit] = await db
      .update(productUnits)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.baseUnitQuantity !== undefined && {
          baseUnitQuantity: data.baseUnitQuantity,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.syncStatus !== undefined && { syncStatus: data.syncStatus }),
        ...(data.syncAttempts !== undefined && {
          syncAttempts: data.syncAttempts,
        }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(productUnits.id, id), eq(productUnits.businessId, ctx.businessId))
      )
      .returning();

    return unit;
  }

  async deactivate(
    ctx: RequestContext,
    id: string
  ): Promise<ProductUnit | undefined> {
    return this.update(ctx, id, { isActive: false });
  }

  async countByProduct(
    ctx: RequestContext,
    productId: string
  ): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productUnits)
      .where(
        and(
          eq(productUnits.productId, productId),
          eq(productUnits.businessId, ctx.businessId)
        )
      );

    return result[0]?.count ?? 0;
  }

  async existsByName(
    ctx: RequestContext,
    productId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(productUnits.productId, productId),
      eq(productUnits.businessId, ctx.businessId),
      eq(productUnits.name, name),
    ];

    if (excludeId) {
      conditions.push(sql`${productUnits.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productUnits)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }

  async reorder(
    ctx: RequestContext,
    productId: string,
    unitIds: string[]
  ): Promise<void> {
    for (let i = 0; i < unitIds.length; i++) {
      await db
        .update(productUnits)
        .set({ sortOrder: i })
        .where(
          and(
            eq(productUnits.id, unitIds[i]),
            eq(productUnits.productId, productId),
            eq(productUnits.businessId, ctx.businessId)
          )
        );
    }
  }
}
