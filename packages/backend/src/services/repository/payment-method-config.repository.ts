import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
import {
  businessPaymentSettings,
  type BusinessPaymentSettings,
  type NewBusinessPaymentSettings,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class PaymentMethodConfigRepository {
  async findByBusinessId(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessPaymentSettings | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.businessPaymentSettings.findFirst({
      where: eq(businessPaymentSettings.businessId, ctx.businessId),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewBusinessPaymentSettings, "businessId">,
    tx?: DbTransaction
  ): Promise<BusinessPaymentSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(businessPaymentSettings)
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
    data: Partial<NewBusinessPaymentSettings>,
    tx?: DbTransaction
  ): Promise<BusinessPaymentSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(businessPaymentSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(businessPaymentSettings.id, id),
        eq(businessPaymentSettings.businessId, ctx.businessId)
      ))
      .returning();

    return result;
  }

  async getOrCreate(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessPaymentSettings> {
    const existing = await this.findByBusinessId(ctx, tx);
    
    if (existing) {
      return existing;
    }

    return this.create(ctx, {
      methods: {
        efectivo: { enabled: true },
        yape: { enabled: false },
        plin: { enabled: false },
        transferencia: { enabled: false },
        tarjeta: { enabled: false },
      },
    }, tx);
  }
}
