import { and, eq, asc } from "drizzle-orm";
import { db } from "../../lib/db";
import { waterRoutes, type WaterRoute, type NewWaterRoute } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export class WaterRouteRepository {
  async findMany(ctx: RequestContext, includeInactive = false): Promise<WaterRoute[]> {
    return db.query.waterRoutes.findMany({
      where: and(
        eq(waterRoutes.businessId, ctx.businessId),
        includeInactive ? undefined : eq(waterRoutes.isActive, 1)
      ),
      orderBy: asc(waterRoutes.name),
    });
  }

  async findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<WaterRoute | undefined> {
    const executor = tx ?? db;
    return executor.query.waterRoutes.findFirst({
      where: and(eq(waterRoutes.id, id), eq(waterRoutes.businessId, ctx.businessId)),
    });
  }

  async create(
    ctx: RequestContext,
    data: Pick<NewWaterRoute, "name" | "zone" | "description">,
    tx?: DbTransaction
  ): Promise<WaterRoute> {
    const executor = tx ?? db;
    const [route] = await executor
      .insert(waterRoutes)
      .values({
        businessId: ctx.businessId,
        name: data.name,
        zone: data.zone ?? null,
        description: data.description ?? null,
        isActive: 1,
      })
      .returning();
    return route;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Pick<NewWaterRoute, "name" | "zone" | "description" | "isActive">>,
    tx?: DbTransaction
  ): Promise<WaterRoute | undefined> {
    const executor = tx ?? db;
    const [route] = await executor
      .update(waterRoutes)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.zone !== undefined && { zone: data.zone }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(waterRoutes.id, id), eq(waterRoutes.businessId, ctx.businessId)))
      .returning();
    return route;
  }
}
