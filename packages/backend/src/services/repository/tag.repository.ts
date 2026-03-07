/**
 * Tag Repository
 * Data access layer for tags
 */
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { tags, customerTags, type Tag, type NewTag } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class TagRepository {
  async findAll(ctx: RequestContext): Promise<Tag[]> {
    return db.query.tags.findMany({
      where: eq(tags.businessId, ctx.businessId),
      orderBy: desc(tags.createdAt),
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Tag | undefined> {
    return db.query.tags.findFirst({
      where: and(
        eq(tags.id, id),
        eq(tags.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewTag, "businessId" | "id" | "createdAt" | "updatedAt">
  ): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return tag;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewTag, "businessId" | "id" | "createdAt" | "updatedAt">>
  ): Promise<Tag | undefined> {
    const [tag] = await db
      .update(tags)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(tags.id, id),
        eq(tags.businessId, ctx.businessId)
      ))
      .returning();

    return tag;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(tags)
      .where(and(
        eq(tags.id, id),
        eq(tags.businessId, ctx.businessId)
      ));
  }

  async countByBusiness(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tags)
      .where(eq(tags.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }

  async getCustomerCount(ctx: RequestContext, tagId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(customerTags)
      .where(eq(customerTags.tagId, tagId));

    return result[0]?.count ?? 0;
  }
}
