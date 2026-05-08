import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  distribucionItems,
  type DistribucionItem,
  type NewDistribucionItem,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class DistribucionItemRepository {
  async findByDistribucionId(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<DistribucionItem[]> {
    return db.query.distribucionItems.findMany({
      where: and(
        eq(distribucionItems.distribucionId, distribucionId),
        eq(distribucionItems.businessId, ctx.businessId)
      ),
      with: {
        variant: true,
      },
    });
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<DistribucionItem | undefined> {
    return db.query.distribucionItems.findFirst({
      where: and(
        eq(distribucionItems.id, id),
        eq(distribucionItems.businessId, ctx.businessId)
      ),
      with: {
        variant: true,
      },
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewDistribucionItem, "id" | "createdAt" | "businessId">,
    tx?: DbTransaction
  ): Promise<DistribucionItem> {
    const executor = tx ?? db;

    const [item] = await executor
      .insert(distribucionItems)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();
    return item;
  }

  async updateVendido(
    ctx: RequestContext,
    id: string,
    cantidad: string,
    tx?: DbTransaction
  ): Promise<DistribucionItem | undefined> {
    const executor = tx ?? db;
    const [item] = await executor
      .update(distribucionItems)
      .set({ cantidadVendida: cantidad })
      .where(and(
        eq(distribucionItems.id, id),
        eq(distribucionItems.businessId, ctx.businessId)
      ))
      .returning();
    return item;
  }

  async updateAsignada(
    ctx: RequestContext,
    id: string,
    cantidadAsignada: string,
    tx?: DbTransaction
  ): Promise<DistribucionItem | undefined> {
    const executor = tx ?? db;
    const [item] = await executor
      .update(distribucionItems)
      .set({ cantidadAsignada })
      .where(and(
        eq(distribucionItems.id, id),
        eq(distribucionItems.businessId, ctx.businessId)
      ))
      .returning();
    return item;
  }

  async updateUnidad(
    ctx: RequestContext,
    id: string,
    unidad: string,
    tx?: DbTransaction
  ): Promise<DistribucionItem | undefined> {
    const executor = tx ?? db;
    const [item] = await executor
      .update(distribucionItems)
      .set({ unidad })
      .where(and(
        eq(distribucionItems.id, id),
        eq(distribucionItems.businessId, ctx.businessId)
      ))
      .returning();
    return item;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(distribucionItems)
      .where(and(
        eq(distribucionItems.id, id),
        eq(distribucionItems.businessId, ctx.businessId)
      ));
  }

  async deleteByDistribucionId(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<void> {
    await db
      .delete(distribucionItems)
      .where(and(
        eq(distribucionItems.distribucionId, distribucionId),
        eq(distribucionItems.businessId, ctx.businessId)
      ));
  }
}
