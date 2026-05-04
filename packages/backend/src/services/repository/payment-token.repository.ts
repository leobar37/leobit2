import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { paymentTokens, type NewPaymentToken, type PaymentToken } from "../../db/schema/payment-tokens";
import { abonos } from "../../db/schema/payments";
import { businesses } from "../../db/schema/businesses";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PaymentTokenRepository {
  async findByPaymentId(
    ctx: RequestContext,
    paymentId: string
  ): Promise<PaymentToken | undefined> {
    const result = await db
      .select({ token: paymentTokens })
      .from(paymentTokens)
      .innerJoin(abonos, eq(abonos.id, paymentTokens.paymentId))
      .where(
        and(eq(paymentTokens.paymentId, paymentId), eq(abonos.businessId, ctx.businessId))
      )
      .limit(1);

    return result[0]?.token;
  }

  async findByToken(
    ctx: RequestContext,
    token: string
  ): Promise<PaymentToken | undefined> {
    const result = await db
      .select({ token: paymentTokens })
      .from(paymentTokens)
      .innerJoin(abonos, eq(abonos.id, paymentTokens.paymentId))
      .where(and(eq(paymentTokens.token, token), eq(abonos.businessId, ctx.businessId)))
      .limit(1);

    return result[0]?.token;
  }

  async findByTokenPublic(token: string): Promise<
    | (PaymentToken & {
        payment: {
          id: string;
          businessId: string;
          customerId: string;
          proofImageId: string | null;
        };
        business: {
          publicCatalogSlug: string | null;
        };
      })
    | undefined
  > {
    const result = await db
      .select({
        token: paymentTokens,
        payment: {
          id: abonos.id,
          businessId: abonos.businessId,
          customerId: abonos.customerId,
          proofImageId: abonos.proofImageId,
        },
        business: {
          publicCatalogSlug: businesses.publicCatalogSlug,
        },
      })
      .from(paymentTokens)
      .innerJoin(abonos, eq(abonos.id, paymentTokens.paymentId))
      .innerJoin(businesses, eq(businesses.id, abonos.businessId))
      .where(eq(paymentTokens.token, token))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...result[0].token,
      payment: result[0].payment,
      business: result[0].business,
    };
  }

  async create(
    _ctx: RequestContext,
    data: Omit<NewPaymentToken, "id" | "createdAt">,
    tx?: DbTransaction
  ): Promise<PaymentToken> {
    const executor = tx ?? db;
    const [token] = await executor
      .insert(paymentTokens)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return token;
  }

  async updateStatus(
    ctx: RequestContext,
    tokenId: string,
    isActive: boolean,
    tx?: DbTransaction
  ): Promise<PaymentToken | undefined> {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(paymentTokens)
      .set({ isActive })
      .where(
        and(
          eq(paymentTokens.id, tokenId),
          eq(
            paymentTokens.paymentId,
            db
              .select({ paymentId: abonos.id })
              .from(abonos)
              .where(eq(abonos.businessId, ctx.businessId))
          )
        )
      )
      .returning();

    return updated;
  }

  async markUsed(tokenId: string): Promise<void> {
    await db
      .update(paymentTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(paymentTokens.id, tokenId));
  }

  async deleteByPaymentId(
    ctx: RequestContext,
    paymentId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    const paymentRecord = await executor
      .select({ id: abonos.id })
      .from(abonos)
      .where(and(eq(abonos.id, paymentId), eq(abonos.businessId, ctx.businessId)))
      .limit(1);

    if (paymentRecord.length === 0) {
      return;
    }

    await executor.delete(paymentTokens).where(eq(paymentTokens.paymentId, paymentId));
  }

  async tokenExists(_ctx: RequestContext, token: string): Promise<boolean> {
    const result = await db
      .select({ count: db.$count(paymentTokens) })
      .from(paymentTokens)
      .where(eq(paymentTokens.token, token));

    return (result[0]?.count ?? 0) > 0;
  }
}
