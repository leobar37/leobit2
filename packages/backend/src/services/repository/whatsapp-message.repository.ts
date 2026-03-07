import { eq, and, desc, gte, lte, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import type { DbTransaction } from "../../lib/db";
import {
  whatsAppMessages,
  type WhatsAppMessage,
  type NewWhatsAppMessage,
  messageStatusEnum,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export type MessageStatus = (typeof messageStatusEnum)[number];

export interface MessageFilters {
  status?: MessageStatus;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class WhatsAppMessageRepository {
  async create(
    ctx: RequestContext,
    data: Omit<NewWhatsAppMessage, "businessId" | "businessUserId" | "id" | "createdAt">,
    tx?: DbTransaction
  ): Promise<WhatsAppMessage> {
    const dbOrTx = tx || db;
    const [message] = await dbOrTx
      .insert(whatsAppMessages)
      .values({
        ...data,
        businessId: ctx.businessId,
        businessUserId: ctx.businessUserId,
      })
      .returning();

    return message;
  }

  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<WhatsAppMessage | undefined> {
    const dbOrTx = tx || db;
    const message = await dbOrTx.query.whatsAppMessages.findFirst({
      where: and(
        eq(whatsAppMessages.id, id),
        eq(whatsAppMessages.businessId, ctx.businessId)
      ),
      with: {
        customer: true,
        template: true,
      },
    });
    return message;
  }

  async findMany(
    ctx: RequestContext,
    filters?: MessageFilters,
    tx?: DbTransaction
  ): Promise<WhatsAppMessage[]> {
    const dbOrTx = tx || db;

    const conditions = [eq(whatsAppMessages.businessId, ctx.businessId)];

    if (filters?.status) {
      conditions.push(eq(whatsAppMessages.status, filters.status));
    }

    if (filters?.customerId) {
      conditions.push(eq(whatsAppMessages.customerId, filters.customerId));
    }

    if (filters?.search) {
      conditions.push(
        like(whatsAppMessages.phoneNumber, `%${filters.search}%`)
      );
    }

    if (filters?.dateFrom) {
      conditions.push(gte(whatsAppMessages.createdAt, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(whatsAppMessages.createdAt, filters.dateTo));
    }

    const messages = await dbOrTx.query.whatsAppMessages.findMany({
      where: and(...conditions),
      orderBy: desc(whatsAppMessages.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
      with: {
        customer: true,
        template: true,
      },
    });

    return messages;
  }

  async count(
    ctx: RequestContext,
    filters?: Omit<MessageFilters, "limit" | "offset">,
    tx?: DbTransaction
  ): Promise<number> {
    const dbOrTx = tx || db;

    const conditions = [eq(whatsAppMessages.businessId, ctx.businessId)];

    if (filters?.status) {
      conditions.push(eq(whatsAppMessages.status, filters.status));
    }

    if (filters?.customerId) {
      conditions.push(eq(whatsAppMessages.customerId, filters.customerId));
    }

    if (filters?.search) {
      conditions.push(
        like(whatsAppMessages.phoneNumber, `%${filters.search}%`)
      );
    }

    if (filters?.dateFrom) {
      conditions.push(gte(whatsAppMessages.createdAt, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(whatsAppMessages.createdAt, filters.dateTo));
    }

    const result = await dbOrTx
      .select({ count: sql<number>`count(*)` })
      .from(whatsAppMessages)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async updateStatus(
    ctx: RequestContext,
    id: string,
    status: MessageStatus,
    errorMessage?: string,
    tx?: DbTransaction
  ): Promise<WhatsAppMessage | undefined> {
    const dbOrTx = tx || db;

    const [message] = await dbOrTx
      .update(whatsAppMessages)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        sentAt: status === "enviado" ? new Date() : undefined,
      })
      .where(
        and(
          eq(whatsAppMessages.id, id),
          eq(whatsAppMessages.businessId, ctx.businessId)
        )
      )
      .returning();

    return message;
  }

  async getStats(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
  }> {
    const dbOrTx = tx || db;

    const result = await dbOrTx
      .select({
        status: whatsAppMessages.status,
        count: sql<number>`count(*)`,
      })
      .from(whatsAppMessages)
      .where(eq(whatsAppMessages.businessId, ctx.businessId))
      .groupBy(whatsAppMessages.status);

    const stats = {
      total: 0,
      sent: 0,
      failed: 0,
    };

    for (const row of result) {
      stats.total += row.count;
      if (row.status === "enviado") {
        stats.sent = row.count;
      } else if (row.status === "fallido") {
        stats.failed = row.count;
      }
    }

    return stats;
  }
}
