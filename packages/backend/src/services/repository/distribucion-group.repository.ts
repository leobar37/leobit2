/**
 * Distribucion Group Repository
 * Data access layer for distribution-group junction table
 */
import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { distribucionGroups, customerGroups, type DistribucionGroup, type NewDistribucionGroup } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface GroupWithName {
  id: string;
  name: string;
}

export class DistribucionGroupRepository {
  /**
   * Find all group links for a distribution
   */
  async findByDistribucionId(
    ctx: RequestContext,
    distribucionId: string,
    tx?: DbTransaction
  ): Promise<DistribucionGroup[]> {
    const executor = tx ?? db;
    return executor
      .select()
      .from(distribucionGroups)
      .where(and(
        eq(distribucionGroups.distribucionId, distribucionId),
        eq(distribucionGroups.businessId, ctx.businessId)
      ));
  }

  /**
   * Find all group names linked to a distribution
   */
  async findGroupsByDistribucionId(
    ctx: RequestContext,
    distribucionId: string,
    tx?: DbTransaction
  ): Promise<GroupWithName[]> {
    const executor = tx ?? db;
    return executor
      .select({
        id: customerGroups.id,
        name: customerGroups.name,
      })
      .from(distribucionGroups)
      .innerJoin(customerGroups, eq(distribucionGroups.groupId, customerGroups.id))
      .where(and(
        eq(distribucionGroups.distribucionId, distribucionId),
        eq(distribucionGroups.businessId, ctx.businessId)
      ));
  }

  /**
   * Link a group to a distribution
   */
  async create(
    ctx: RequestContext,
    data: { distribucionId: string; groupId: string },
    tx?: DbTransaction
  ): Promise<DistribucionGroup> {
    const executor = tx ?? db;
    const [link] = await executor
      .insert(distribucionGroups)
      .values({
        businessId: ctx.businessId,
        distribucionId: data.distribucionId,
        groupId: data.groupId,
      })
      .returning();
    return link;
  }

  /**
   * Link multiple groups to a distribution
   */
  async createMany(
    ctx: RequestContext,
    distribucionId: string,
    groupIds: string[],
    tx?: DbTransaction
  ): Promise<DistribucionGroup[]> {
    if (groupIds.length === 0) return [];
    const executor = tx ?? db;
    const values: Omit<NewDistribucionGroup, "id">[] = groupIds.map((groupId) => ({
      businessId: ctx.businessId,
      distribucionId,
      groupId,
    }));
    return executor.insert(distribucionGroups).values(values).returning();
  }

  /**
   * Remove all group links for a distribution
   */
  async deleteByDistribucionId(
    ctx: RequestContext,
    distribucionId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;
    await executor
      .delete(distribucionGroups)
      .where(and(
        eq(distribucionGroups.distribucionId, distribucionId),
        eq(distribucionGroups.businessId, ctx.businessId)
      ));
  }
}
