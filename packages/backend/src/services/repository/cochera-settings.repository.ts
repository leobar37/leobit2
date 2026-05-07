import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
import {
  cocheraSettings,
  type CocheraSettings,
  type NewCocheraSettings,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class CocheraSettingsRepository {
  async findByBusinessId(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<CocheraSettings | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.cocheraSettings.findFirst({
      where: eq(cocheraSettings.businessId, ctx.businessId),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewCocheraSettings, "businessId">,
    tx?: DbTransaction
  ): Promise<CocheraSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(cocheraSettings)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return result;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<NewCocheraSettings>,
    tx?: DbTransaction
  ): Promise<CocheraSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(cocheraSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cocheraSettings.id, id),
          eq(cocheraSettings.businessId, ctx.businessId)
        )
      )
      .returning();

    return result;
  }

  async getOrCreate(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<CocheraSettings> {
    const existing = await this.findByBusinessId(ctx, tx);

    if (existing) {
      return existing;
    }

    return this.create(
      ctx,
      {
        hourlyRate: "0",
        dailyRate: null,
        graceMinutes: 0,
        totalSpaces: 0,
        acceptedPaymentMethods: ["efectivo"],
      },
      tx
    );
  }
}
