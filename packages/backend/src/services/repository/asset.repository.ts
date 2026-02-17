import { eq, and, desc, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { assets, type Asset, type NewAsset } from "../../db/schema/assets";
import type { RequestContext } from "../../context/request-context";

export class AssetRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Asset[]> {
    return db.query.assets.findMany({
      where: and(
        eq(assets.businessId, ctx.businessId),
        isNull(assets.deletedAt)
      ),
      orderBy: desc(assets.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Asset | undefined> {
    return db.query.assets.findFirst({
      where: and(
        eq(assets.id, id),
        eq(assets.businessId, ctx.businessId),
        isNull(assets.deletedAt)
      ),
    });
  }

  async findByIds(ctx: RequestContext, ids: string[]): Promise<Asset[]> {
    if (ids.length === 0) return [];
    
    return db.query.assets.findMany({
      where: and(
        inArray(assets.id, ids),
        eq(assets.businessId, ctx.businessId),
        isNull(assets.deletedAt)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewAsset, "businessId" | "id" | "createdAt" | "deletedAt" | "deletedBy">
  ): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return asset;
  }

  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .update(assets)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      })
      .where(and(
        eq(assets.id, id),
        eq(assets.businessId, ctx.businessId),
        isNull(assets.deletedAt)
      ));
  }

  async count(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(
        eq(assets.businessId, ctx.businessId),
        isNull(assets.deletedAt)
      ));

    return result[0]?.count ?? 0;
  }
}
