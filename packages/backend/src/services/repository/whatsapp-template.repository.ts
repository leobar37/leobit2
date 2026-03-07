import { eq, and, desc, like } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  whatsAppTemplates,
  type WhatsAppTemplate,
  type NewWhatsAppTemplate,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class WhatsAppTemplateRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<WhatsAppTemplate[]> {
    const query = db.query.whatsAppTemplates.findMany({
      where: and(
        eq(whatsAppTemplates.businessId, ctx.businessId),
        filters?.search
          ? like(whatsAppTemplates.name, `%${filters.search}%`)
          : undefined
      ),
      orderBy: desc(whatsAppTemplates.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });

    return query;
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<WhatsAppTemplate | undefined> {
    const template = await db.query.whatsAppTemplates.findFirst({
      where: and(
        eq(whatsAppTemplates.id, id),
        eq(whatsAppTemplates.businessId, ctx.businessId)
      ),
    });
    return template;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewWhatsAppTemplate, "businessId" | "businessUserId" | "id" | "createdAt" | "updatedAt">
  ): Promise<WhatsAppTemplate> {
    const [template] = await db
      .insert(whatsAppTemplates)
      .values({
        ...data,
        businessId: ctx.businessId,
        businessUserId: ctx.businessUserId,
      })
      .returning();

    return template;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<
      Omit<
        NewWhatsAppTemplate,
        "businessId" | "businessUserId" | "id" | "createdAt" | "updatedAt"
      >
    >
  ): Promise<WhatsAppTemplate | undefined> {
    const [template] = await db
      .update(whatsAppTemplates)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsAppTemplates.id, id),
          eq(whatsAppTemplates.businessId, ctx.businessId)
        )
      )
      .returning();

    return template;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(whatsAppTemplates)
      .where(
        and(
          eq(whatsAppTemplates.id, id),
          eq(whatsAppTemplates.businessId, ctx.businessId)
        )
      );
  }

  async findDefault(ctx: RequestContext): Promise<WhatsAppTemplate | undefined> {
    const template = await db.query.whatsAppTemplates.findFirst({
      where: and(
        eq(whatsAppTemplates.businessId, ctx.businessId),
        eq(whatsAppTemplates.isDefault, true)
      ),
    });
    return template;
  }
}
