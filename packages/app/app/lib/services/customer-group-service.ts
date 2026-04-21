/**
 * Customer Group Service
 * 
 * This file extends the generated CustomerGroupsService from drizzle-sync
 * to preserve custom member management and enriched return types.
 * 
 * Generated at: 2026-04-20
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { SyncStatus, customerGroups, customerGroupMembers, customers, type CustomerGroup } from "@avileo/shared";

import { CustomerGroupsService, type CreateCustomerGroupsInput, type UpdateCustomerGroupsInput } from "~/lib/sync/generated/services";
import type { SyncWritePort } from "@avileo/drizzle-sync/client";

// Re-export input types with original names for backward compatibility
export type CreateCustomerGroupInput = CreateCustomerGroupsInput;
export type UpdateCustomerGroupInput = UpdateCustomerGroupsInput;

export interface GroupMemberWithCustomer {
  customerId: string;
  customerName: string;
  addedAt: Date;
}

export interface CustomerGroupSummary {
  id: string;
  name: string;
  syncStatus: string;
}

export interface CustomerGroupSummaryWithCustomerId extends CustomerGroupSummary {
  customerId: string;
}

export interface CustomerGroupWithMemberCount extends Omit<CustomerGroup, "businessId"> {
  memberCount?: number;
}

export interface CustomerGroupWithMembers extends CustomerGroup {
  members?: GroupMemberWithCustomer[];
}

/**
 * Customer Group Service
 * Extends the generated CustomerGroupsService with custom member management.
 * 
 * Preserved custom methods:
 * - findAll(): Promise<CustomerGroupWithMemberCount[]> - Groups with member count
 * - findById(id): Promise<CustomerGroupWithMembers | null> - Group with members
 * - getMemberCount(groupId): Promise<number> - Member count helper
 * - getMembers(groupId): Promise<GroupMemberWithCustomer[]> - Get members with customer info
 * - getCustomerGroups(customerId): Promise<CustomerGroupSummary[]> - Groups for a customer
 * - getCustomerGroupsForCustomers(customerIds): Promise<CustomerGroupSummaryWithCustomerId[]> - Groups for multiple customers
 * - createWithMembers(input, customerIds): Promise<{ group: CustomerGroup }> - Atomic group + members
 * - addMembers(groupId, customerIds, syncGroupId?): Promise<void> - Add members
 * - removeMember(groupId, customerId): Promise<void> - Remove a member
 * - isMember(groupId, customerId): Promise<boolean> - Check membership
 */
export class CustomerGroupService extends CustomerGroupsService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncWritePort,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  /**
   * Find all groups with member counts
   * Overrides to return enriched type with member count
   */
  async findAll(): Promise<CustomerGroupWithMemberCount[]> {
    const groups = await this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.businessId, this.businessId))
      .orderBy(desc(customerGroups.createdAt));

    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await this.getMemberCount(group.id);
        return {
          id: group.id,
          name: group.name,
          syncStatus: group.syncStatus,
          syncAttempts: group.syncAttempts,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          memberCount,
        };
      })
    );

    return groupsWithCounts;
  }

  /**
   * Find a group by ID with members
   * Overrides to return enriched type with members
   */
  async findById(id: string): Promise<CustomerGroupWithMembers | null> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, id),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      return null;
    }

    const members = await this.getMembers(id);

    return {
      id: group[0].id,
      name: group[0].name,
      syncStatus: group[0].syncStatus,
      syncAttempts: group[0].syncAttempts,
      createdAt: group[0].createdAt,
      updatedAt: group[0].updatedAt,
      businessId: group[0].businessId,
      members,
    };
  }

  /**
   * Get member count for a group
   * Custom helper method for enrichment
   */
  async getMemberCount(groupId: string): Promise<number> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      return 0;
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.businessId, this.businessId)
      ));

    return result[0]?.count ?? 0;
  }

  /**
   * Get members with customer information
   * Custom method for enriched return type
   */
  async getMembers(groupId: string): Promise<GroupMemberWithCustomer[]> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      return [];
    }

    const results = await this.db
      .select({
        customerId: customerGroupMembers.customerId,
        customerName: customers.name,
        addedAt: customerGroupMembers.addedAt,
      })
      .from(customerGroupMembers)
      .innerJoin(customers, eq(customerGroupMembers.customerId, customers.id))
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.businessId, this.businessId)
      ));

    return results.map(row => ({
      customerId: row.customerId,
      customerName: row.customerName,
      addedAt: row.addedAt,
    }));
  }

  /**
   * Get all groups for a specific customer
   * Custom query method
   */
  async getCustomerGroups(customerId: string): Promise<CustomerGroupSummary[]> {
    const results = await this.db
      .select({
        id: customerGroups.id,
        name: customerGroups.name,
        syncStatus: customerGroups.syncStatus,
      })
      .from(customerGroupMembers)
      .innerJoin(customerGroups, eq(customerGroupMembers.groupId, customerGroups.id))
      .where(
        and(
          eq(customerGroupMembers.customerId, customerId),
          eq(customerGroups.businessId, this.businessId)
        )
      )
      .orderBy(desc(customerGroups.createdAt));

    return results;
  }

  /**
   * Get all groups for multiple customers
   * Custom query method for batch operations
   */
  async getCustomerGroupsForCustomers(customerIds: string[]): Promise<CustomerGroupSummaryWithCustomerId[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const results = await this.db
      .select({
        customerId: customerGroupMembers.customerId,
        id: customerGroups.id,
        name: customerGroups.name,
        syncStatus: customerGroups.syncStatus,
      })
      .from(customerGroupMembers)
      .innerJoin(customerGroups, eq(customerGroupMembers.groupId, customerGroups.id))
      .where(
        and(
          inArray(customerGroupMembers.customerId, customerIds),
          eq(customerGroupMembers.businessId, this.businessId),
          eq(customerGroups.businessId, this.businessId)
        )
      )
      .orderBy(desc(customerGroups.createdAt));

    return results;
  }

  /**
   * Create a group with initial members atomically
   * Members are synced with FK reference (groupId in payload) for ordering
   */
  async createWithMembers(input: CreateCustomerGroupInput, customerIds: string[]): Promise<{ group: CustomerGroup }> {
    const group = await this.create(input);

    if (customerIds.length > 0) {
      await this.addMembers(group.id, customerIds);
    }

    return { group };
  }

  /**
   * Delete a group and all its members
   * Overrides to cascade member deletion
   */
  async delete(id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, id),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (existing.length === 0) {
      throw new Error(`Customer group not found: ${id}`);
    }

    // Query all current members before deleting to sync their deletions individually
    const members = await this.db
      .select({ id: customerGroupMembers.id })
      .from(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, id));

    // Queue individual delete sync operations for each member
    for (const member of members) {
      await this.queueSync("delete", member.id, {}, "customer_group_members");
    }

    await this.db
      .delete(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, id));

    await this.db
      .delete(customerGroups)
      .where(eq(customerGroups.id, id));

    await this.queueSync("delete", id, {});
  }

  /**
   * Add members to a group
   * Custom method for member management
   * Uses FK reference (groupId in payload) for ordering, not syncGroupId
   */
  async addMembers(groupId: string, customerIds: string[]): Promise<void> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      throw new Error(`Customer group not found: ${groupId}`);
    }

    const existingMembers = await this.db
      .select({ customerId: customerGroupMembers.customerId })
      .from(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, groupId));

    const existingCustomerIds = new Set(existingMembers.map(m => m.customerId));
    const newCustomerIds = customerIds.filter(id => !existingCustomerIds.has(id));

    if (newCustomerIds.length === 0) {
      return;
    }

    const now = new Date(this.now());
    const memberIds: string[] = [];
    const members: Record<string, unknown>[] = newCustomerIds.map(customerId => {
      const memberId = this.generateId();
      memberIds.push(memberId);
      return {
        id: memberId,
        businessId: this.businessId,
        groupId,
        customerId,
        addedBy: this.businessUserId,
        syncStatus: SyncStatus.PENDING,
        syncAttempts: 0,
        addedAt: now,
      };
    });

    await this.db.insert(customerGroupMembers).values(members as never[]);

    // Queue sync operations with FK reference (groupId in payload) for topological ordering
    for (let i = 0; i < newCustomerIds.length; i++) {
      await this.queueSync("create", memberIds[i], {
        groupId,
        customerId: newCustomerIds[i],
      }, "customer_group_members");
    }
  }

  /**
   * Remove a member from a group
   * Custom method for member management
   */
  async removeMember(groupId: string, customerId: string): Promise<void> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      throw new Error(`Customer group not found: ${groupId}`);
    }

    // Look up the member to get its actual UUID
    const member = await this.db
      .select()
      .from(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.customerId, customerId)
      ))
      .limit(1);

    if (member.length === 0) {
      throw new Error(`Customer ${customerId} is not a member of group ${groupId}`);
    }

    const memberId = member[0].id;

    await this.db
      .delete(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.customerId, customerId)
      ));

    await this.queueSync("delete", memberId, {
      groupId,
      customerId,
    });
  }

  /**
   * Check if a customer is a member of a group
   * Custom method for member management
   */
  async isMember(groupId: string, customerId: string): Promise<boolean> {
    const group = await this.db
      .select()
      .from(customerGroups)
      .where(and(
        eq(customerGroups.id, groupId),
        eq(customerGroups.businessId, this.businessId)
      ))
      .limit(1);

    if (group.length === 0) {
      return false;
    }

    const result = await this.db
      .select()
      .from(customerGroupMembers)
      .where(and(
        eq(customerGroupMembers.groupId, groupId),
        eq(customerGroupMembers.customerId, customerId)
      ))
      .limit(1);

    return result.length > 0;
  }
}
