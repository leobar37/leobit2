/**
 * Customer Tag Repository
 * Data access layer for customer-tag assignments
 */
import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { customerTags, tags, customers, type CustomerTag, type NewCustomerTag, type Tag } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface CustomerTagWithDetails extends CustomerTag {
  tag: Tag;
}

export class CustomerTagRepository {
  async findByCustomer(ctx: RequestContext, customerId: string): Promise<CustomerTagWithDetails[]> {
    const results = await db.query.customerTags.findMany({
      where: eq(customerTags.customerId, customerId),
      with: {
        tag: true,
      },
    });

    return results as CustomerTagWithDetails[];
  }

  async findByTag(ctx: RequestContext, tagId: string): Promise<CustomerTag[]> {
    return db.query.customerTags.findMany({
      where: eq(customerTags.tagId, tagId),
    });
  }

  async assignTags(
    ctx: RequestContext,
    customerId: string,
    tagIds: string[]
  ): Promise<void> {
    // First, remove all existing tags for this customer
    await db
      .delete(customerTags)
      .where(eq(customerTags.customerId, customerId));

    // Then, insert new assignments if any
    if (tagIds.length > 0) {
      const assignments: Omit<NewCustomerTag, "assignedAt">[] = tagIds.map((tagId) => ({
        customerId,
        tagId,
        assignedBy: ctx.businessUserId,
      }));

      await db
        .insert(customerTags)
        .values(assignments.map(a => ({
          ...a,
          assignedAt: new Date(),
        })));
    }
  }

  async addTag(
    ctx: RequestContext,
    customerId: string,
    tagId: string
  ): Promise<CustomerTag> {
    const [assignment] = await db
      .insert(customerTags)
      .values({
        customerId,
        tagId,
        assignedBy: ctx.businessUserId,
        assignedAt: new Date(),
      })
      .returning();

    return assignment;
  }

  async removeTag(
    ctx: RequestContext,
    customerId: string,
    tagId: string
  ): Promise<void> {
    await db
      .delete(customerTags)
      .where(and(
        eq(customerTags.customerId, customerId),
        eq(customerTags.tagId, tagId)
      ));
  }

  async removeAllTags(ctx: RequestContext, customerId: string): Promise<void> {
    await db
      .delete(customerTags)
      .where(eq(customerTags.customerId, customerId));
  }

  async getCustomersByTags(
    ctx: RequestContext,
    tagIds: string[]
  ): Promise<string[]> {
    // Returns customer IDs that have ALL the specified tags
    const results = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(
        inArray(customerTags.tagId, tagIds)
      )
      .groupBy(customerTags.customerId)
      .having(
        sql`count(distinct ${customerTags.tagId}) = ${tagIds.length}`
      );

    return results.map(r => r.customerId);
  }

  async hasTag(ctx: RequestContext, customerId: string, tagId: string): Promise<boolean> {
    const result = await db.query.customerTags.findFirst({
      where: and(
        eq(customerTags.customerId, customerId),
        eq(customerTags.tagId, tagId)
      ),
    });

    return !!result;
  }
}


