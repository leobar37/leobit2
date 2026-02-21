import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  distribucionItems,
  type DistribucionItem,
  type NewDistribucionItem,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DistribucionItemRepository {
  async findByDistribucionId(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<DistribucionItem[]> {
    return db.query.distribucionItems.findMany({
      where: eq(distribucionItems.distribucionId, distribucionId),
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
      where: eq(distribucionItems.id, id),
      with: {
        variant: true,
      },
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewDistribucionItem, "id" | "createdAt">
  ): Promise<DistribucionItem> {
    const [item] = await db
      .insert(distribucionItems)
      .values(data)
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
      .where(eq(distribucionItems.id, id))
      .returning();
    return item;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(distribucionItems)
      .where(eq(distribucionItems.id, id));
  }

  async deleteByDistribucionId(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<void> {
    await db
      .delete(distribucionItems)
      .where(eq(distribucionItems.distribucionId, distribucionId));
  }
}
