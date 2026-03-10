/**
 * Sale Token Repository
 * Data access layer for sale tokens
 */
import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { saleTokens, type SaleToken, type NewSaleToken } from "../../db/schema/sale-tokens";
import { sales } from "../../db/schema/sales";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class SaleTokenRepository {
  /**
   * Find token by sale ID
   */
  async findBySaleId(ctx: RequestContext, saleId: string): Promise<SaleToken | undefined> {
    return db.query.saleTokens.findFirst({
      where: and(
        eq(saleTokens.saleId, saleId),
        eq(sales.businessId, ctx.businessId)
      ),
      with: {
        sale: true,
      },
    });
  }

  /**
   * Find token by token string (with context)
   */
  async findByToken(ctx: RequestContext, token: string): Promise<SaleToken | undefined> {
    return db.query.saleTokens.findFirst({
      where: and(
        eq(saleTokens.token, token),
        eq(sales.businessId, ctx.businessId)
      ),
      with: {
        sale: true,
      },
    });
  }

  /**
   * Find token by token string (public - no context required)
   */
  async findByTokenPublic(token: string): Promise<
    | (SaleToken & {
        sale: { id: string; status: string; businessId: string; allowCustomerEdit: boolean };
      })
    | undefined
  > {
    const result = await db
      .select({
        token: saleTokens,
        sale: {
          id: sales.id,
          status: sales.status,
          businessId: sales.businessId,
          allowCustomerEdit: sales.allowCustomerEdit,
        },
      })
      .from(saleTokens)
      .innerJoin(sales, eq(sales.id, saleTokens.saleId))
      .where(eq(saleTokens.token, token))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...result[0].token,
      sale: result[0].sale,
    };
  }

  /**
   * Create a new token
   */
  async create(ctx: RequestContext, data: Omit<NewSaleToken, "id" | "createdAt">, tx?: DbTransaction): Promise<SaleToken> {
    const executor = tx ?? db;

    const [token] = await executor
      .insert(saleTokens)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return token;
  }

  /**
   * Update token status (activate/deactivate)
   */
  async updateStatus(
    ctx: RequestContext,
    tokenId: string,
    isActive: boolean,
    tx?: DbTransaction
  ): Promise<SaleToken | undefined> {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(saleTokens)
      .set({ isActive })
      .where(
        and(
          eq(saleTokens.id, tokenId),
          eq(sales.businessId, ctx.businessId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Mark token as used (update lastUsedAt)
   */
  async markUsed(ctx: RequestContext, tokenId: string): Promise<void> {
    await db
      .update(saleTokens)
      .set({ lastUsedAt: new Date() })
      .where(
        and(
          eq(saleTokens.id, tokenId),
          eq(sales.businessId, ctx.businessId)
        )
      );
  }

  /**
   * Delete token by sale ID (for regeneration)
   */
  async deleteBySaleId(ctx: RequestContext, saleId: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;

    await executor
      .delete(saleTokens)
      .where(
        and(
          eq(saleTokens.saleId, saleId),
          eq(sales.businessId, ctx.businessId)
        )
      );
  }

  /**
   * Check if token exists
   */
  async tokenExists(_ctx: RequestContext, token: string): Promise<boolean> {
    const result = await db
      .select({ count: db.$count(saleTokens) })
      .from(saleTokens)
      .where(eq(saleTokens.token, token));

    return (result[0]?.count ?? 0) > 0;
  }
}
