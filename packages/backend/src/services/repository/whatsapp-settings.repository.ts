import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import type { DbTransaction } from "../../lib/txid";
import {
  businessUserWhatsAppSettings,
  type BusinessUserWhatsAppSettings,
  type NewBusinessUserWhatsAppSettings,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class WhatsAppSettingsRepository {
  async findByBusinessUserId(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessUserWhatsAppSettings | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.businessUserWhatsAppSettings.findFirst({
      where: eq(
        businessUserWhatsAppSettings.businessUserId,
        ctx.businessUserId
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewBusinessUserWhatsAppSettings, "businessUserId" | "businessId">,
    tx?: DbTransaction
  ): Promise<BusinessUserWhatsAppSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(businessUserWhatsAppSettings)
      .values({
        ...data,
        businessUserId: ctx.businessUserId,
        businessId: ctx.businessId,
      })
      .returning();

    return result;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<NewBusinessUserWhatsAppSettings>,
    tx?: DbTransaction
  ): Promise<BusinessUserWhatsAppSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(businessUserWhatsAppSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessUserWhatsAppSettings.id, id),
          eq(businessUserWhatsAppSettings.businessId, ctx.businessId)
        )
      )
      .returning();

    return result;
  }

  async updateConnection(
    ctx: RequestContext,
    id: string,
    data: {
      isConnected: boolean;
      phoneNumber?: string | null;
      instanceName?: string | null;
    },
    tx?: DbTransaction
  ): Promise<BusinessUserWhatsAppSettings> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(businessUserWhatsAppSettings)
      .set({
        isConnected: data.isConnected,
        phoneNumber: data.phoneNumber ?? null,
        instanceName: data.instanceName ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessUserWhatsAppSettings.id, id),
          eq(businessUserWhatsAppSettings.businessId, ctx.businessId)
        )
      )
      .returning();

    return result;
  }

  async getOrCreate(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessUserWhatsAppSettings> {
    const existing = await this.findByBusinessUserId(ctx, tx);

    if (existing) {
      return existing;
    }

    return this.create(
      ctx,
      {
        isConnected: false,
        phoneNumber: null,
        instanceName: null,
      },
      tx
    );
  }
}
