import { and, eq, isNull, gt } from "drizzle-orm";
import { db } from "../../lib/db";
import { saleTokens, type SaleToken, type NewSaleToken } from "../../db/schema/sale-tokens";
import { sales } from "../../db/schema/sales";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class SaleTokenRepository {
  async findById(ctx: RequestContext, id: string): Promise<SaleToken | undefined> {
    const result = await db
      .select({
        token: saleTokens,
      })
      .from(saleTokens)
      .innerJoin(sales, eq(sales.id, saleTokens.saleId))
      .where(
        and(
          eq(saleTokens.id, id),
          eq(sales.businessId, ctx.businessId)
        )
      );

    return result[0]?.token;
  }

  async findByToken(ctx: RequestContext, token: string): Promise<SaleToken | undefined> {
    const result = await db
      .select({
        token: saleTokens,
      })
      .from(saleTokens)
      .innerJoin(sales, eq(sales.id, saleTokens.saleId))
      .where(
        and(
          eq(saleTokens.token, token),
          eq(sales.businessId, ctx.businessId)
        )
      );

    return result[0]?.token;
  }

  async findByTokenPublic(token: string): Promise<(SaleToken & { sale: { id: string; businessId: string } }) | undefined> {
    const result = await db
      .select({
        token: saleTokens,
        saleId: sales.id,
        saleBusinessId: sales.businessId,
      })
      .from(saleTokens)
      .innerJoin(sales, eq(sales.id, saleTokens.saleId))
      .where(eq(saleTokens.token, token));

    if (!result[0]) return undefined;

    return {
      ...result[0].token,
      sale: {
        id: result[0].saleId,
        businessId: result[0].saleBusinessId,
      },
    };
  }

  async findValidBySaleId(ctx: RequestContext, saleId: string): Promise<SaleToken | undefined> {
    const result = await db
      .select({
        token: saleTokens,
      })
      .from(saleTokens)
      .innerJoin(sales, eq(sales.id, saleTokens.saleId))
      .where(
        and(
          eq(saleTokens.saleId, saleId),
          eq(sales.businessId, ctx.businessId),
          isNull(saleTokens.usedAt),
          gt(saleTokens.expiresAt, new Date())
        )
      );

    return result[0]?.token;
  }

  async create(
    ctx: RequestContext,
    data: Pick<NewSaleToken, "saleId" | "token" | "expiresAt">,
    tx?: DbTransaction
  ): Promise<SaleToken> {
    const executor = tx ?? db;

    const [created] = await executor
      .insert(saleTokens)
      .values({
        saleId: data.saleId,
        token: data.token,
        expiresAt: data.expiresAt,
      })
      .returning();

    return created;
  }

  async markAsUsed(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<SaleToken | undefined> {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(saleTokens)
      .set({ usedAt: new Date() })
      .where(eq(saleTokens.id, id))
      .returning();

    return updated;
  }

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(saleTokens).where(eq(saleTokens.id, id));
  }

  async deleteBySaleId(ctx: RequestContext, saleId: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(saleTokens).where(eq(saleTokens.saleId, saleId));
  }
}
