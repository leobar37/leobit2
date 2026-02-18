import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  businessPaymentSettings,
  type BusinessPaymentSettings,
  type NewBusinessPaymentSettings,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class PaymentMethodConfigRepository {
  async findByBusinessId(
    ctx: RequestContext
  ): Promise<BusinessPaymentSettings | undefined> {
    return db.query.businessPaymentSettings.findFirst({
      where: eq(businessPaymentSettings.businessId, ctx.businessId),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewBusinessPaymentSettings, "businessId">
  ): Promise<BusinessPaymentSettings> {
    const [result] = await db
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
    data: Partial<NewBusinessPaymentSettings>
  ): Promise<BusinessPaymentSettings> {
    const [result] = await db
      .update(businessPaymentSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(businessPaymentSettings.id, id))
      .returning();

    return result;
  }

  async getOrCreate(
    ctx: RequestContext
  ): Promise<BusinessPaymentSettings> {
    const existing = await this.findByBusinessId(ctx);
    
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
    });
  }
}
