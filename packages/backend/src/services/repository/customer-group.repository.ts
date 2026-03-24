/**
 * Customer Group Repository
 * Data access layer for customer groups
 */
import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { customerGroups, customerGroupMembers, customers, type CustomerGroup, type NewCustomerGroup, type CustomerGroupMember, type NewCustomerGroupMember } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface CustomerGroupWithMemberCount extends CustomerGroup {
  memberCount: number;
}

export interface CustomerGroupWithMembers extends CustomerGroup {
  members: Array<{
    customerId: string;
    customerName: string;
    addedAt: Date;
  }>;
}

export class CustomerGroupRepository {
  /**
   * Find all customer groups for a business
   */
  async findAll(ctx: RequestContext): Promise<CustomerGroupWithMemberCount[]> {
    const groups = await db.query.customerGroups.findMany({
      where: eq(customerGroups.businessId, ctx.businessId),
      orderBy: (customerGroups, { asc }) => [asc(customerGroups.name)],
    });

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await this.getMemberCount(ctx, group.id);
        return {
          ...group,
          memberCount,
        };
      })
    );

    return groupsWithCounts;
  }

  /**
   * Get member count for a group
   */
  async getMemberCount(ctx: RequestContext, groupId: string): Promise<number> {
    const group = await this.findById(ctx, groupId);
    if (!group) {
      return 0;
    }

    const result = await db
      .select({ count: customerGroupMembers.id })
      .from(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, groupId));

    return result.length;
  }

  /**
   * Find a single customer group by ID
   */
  async findById(ctx: RequestContext, groupId: string, tx?: DbTransaction): Promise<CustomerGroup | null> {
    const executor = tx ?? db;
    const group = await executor.query.customerGroups.findFirst({
      where: and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, ctx.businessId)
      ),
    });

    return group || null;
  }

  /**
   * Find a group with its members
   */
  async findByIdWithMembers(ctx: RequestContext, groupId: string): Promise<CustomerGroupWithMembers | null> {
    const group = await this.findById(ctx, groupId);
    if (!group) {
      return null;
    }

    const members = await this.getMembers(ctx, groupId);

    return {
      ...group,
      members,
    };
  }

  /**
   * Get all members of a group
   */
  async getMembers(ctx: RequestContext, groupId: string): Promise<Array<{
    customerId: string;
    customerName: string;
    addedAt: Date;
  }>> {
    const results = await db
      .select({
        customerId: customerGroupMembers.customerId,
        customerName: customers.name,
        addedAt: customerGroupMembers.addedAt,
      })
      .from(customerGroupMembers)
      .innerJoin(customers, eq(customerGroupMembers.customerId, customers.id))
      .where(eq(customerGroupMembers.groupId, groupId));

    return results;
  }

  /**
   * Create a new customer group
   */
  async create(ctx: RequestContext, data: { name: string }): Promise<CustomerGroup> {
    const [group] = await db
      .insert(customerGroups)
      .values({
        name: data.name,
        businessId: ctx.businessId,
        syncStatus: "synced",
        syncAttempts: 0,
      })
      .returning();

    return group;
  }

  /**
   * Update a customer group
   */
  async update(ctx: RequestContext, groupId: string, data: { name: string }): Promise<CustomerGroup> {
    const [group] = await db
      .update(customerGroups)
      .set({
        name: data.name,
        updatedAt: new Date(),
      })
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, ctx.businessId)
      ))
      .returning();

    return group;
  }

  /**
   * Delete a customer group (cascade deletes members)
   */
  async delete(ctx: RequestContext, groupId: string): Promise<void> {
    await db
      .delete(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, ctx.businessId)
      ));
  }

  /**
   * Add customers to a group
   */
  async addMembers(ctx: RequestContext, groupId: string, customerIds: string[], tx?: DbTransaction): Promise<CustomerGroupMember[]> {
    const executor = tx ?? db;

    // Verify group exists and belongs to business
    const group = await this.findById(ctx, groupId, tx);
    if (!group) {
      throw new Error("Group not found");
    }

    // Get existing member IDs to avoid duplicates
    const existingMembers = await executor
      .select({ customerId: customerGroupMembers.customerId })
      .from(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        inArray(customerGroupMembers.customerId, customerIds)
      ));

    const existingCustomerIds = new Set(existingMembers.map(m => m.customerId));
    const newCustomerIds = customerIds.filter(id => !existingCustomerIds.has(id));

    if (newCustomerIds.length === 0) {
      return [];
    }

    const members: Omit<NewCustomerGroupMember, "id">[] = newCustomerIds.map((customerId) => ({
      businessId: ctx.businessId,
      groupId,
      customerId,
      addedBy: ctx.businessUserId,
      syncStatus: "synced",
      syncAttempts: 0,
    }));

    const result = await executor
      .insert(customerGroupMembers)
      .values(members)
      .returning();

    return result;
  }

  /**
   * Remove a customer from a group
   */
  async removeMember(ctx: RequestContext, groupId: string, customerId: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;

    // Verify group exists and belongs to business
    const group = await this.findById(ctx, groupId, tx);
    if (!group) {
      throw new Error("Group not found");
    }

    await executor
      .delete(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.customerId, customerId)
      ));
  }

  /**
   * Check if a customer is a member of a group
   */
  async isMember(ctx: RequestContext, groupId: string, customerId: string): Promise<boolean> {
    const result = await db.query.customerGroupMembers.findFirst({
      where: and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.customerId, customerId)
      ),
    });

    return !!result;
  }

  /**
   * Find all groups that a customer belongs to
   */
  async findByCustomerId(ctx: RequestContext, customerId: string): Promise<Array<{
    id: string;
    name: string;
    syncStatus: string;
  }>> {
    const results = await db
      .select({
        id: customerGroups.id,
        name: customerGroups.name,
        syncStatus: customerGroups.syncStatus,
      })
      .from(customerGroupMembers)
      .innerJoin(
        customerGroups,
        eq(customerGroupMembers.groupId, customerGroups.id)
      )
      .where(and(
        eq(customerGroupMembers.customerId, customerId),
        eq(customerGroups.businessId, ctx.businessId)
      ))
      .orderBy(desc(customerGroups.createdAt));

    return results;
  }
}
