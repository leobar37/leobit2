/**
 * Customer Group Service
 * Local-first customer groups entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, customerGroups, customerGroupMembers, customers, type CustomerGroup, type CustomerGroupMember } from "@avileo/shared";
import { eq, and, desc, sql } from "drizzle-orm";

export interface CreateCustomerGroupInput {
  name: string;
}

export interface UpdateCustomerGroupInput {
  name: string;
}

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

export interface CustomerGroupWithMemberCount extends Omit<CustomerGroup, "businessId"> {
  memberCount?: number;
}

export interface CustomerGroupWithMembers extends Omit<CustomerGroup, "businessId"> {
  members?: GroupMemberWithCustomer[];
}

export class CustomerGroupService extends BaseService {
  private static readonly ENTITY_TYPE: EntityType = "customer_groups";
  private static readonly ID_PREFIX = "grp";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  getEntityType(): EntityType {
    return CustomerGroupService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return CustomerGroupService.ID_PREFIX;
  }

  async findAll(): Promise<CustomerGroupWithMemberCount[]> {
    console.log('[DEBUG CustomerGroupService.findAll] businessId:', this.businessId);
    
    const groups = await this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.businessId, this.businessId))
      .orderBy(desc(customerGroups.createdAt));

    console.log('[DEBUG CustomerGroupService.findAll] Raw groups from DB:', groups.length, groups.map(g => ({ id: g.id, name: g.name })));

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

    console.log('[DEBUG CustomerGroupService.findAll] Returning groups with counts:', groupsWithCounts.length);
    return groupsWithCounts;
  }

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
      members,
    };
  }

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

  async create(input: CreateCustomerGroupInput, syncGroupId?: string): Promise<CustomerGroup> {
    const id = this.generateId();
    const now = new Date(this.now());

    const group: Partial<CustomerGroup> = {
      id,
      name: input.name,
      businessId: this.businessId,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    console.log('[DEBUG CustomerGroupService.create] INSERTING group into local DB:', { id, name: input.name, businessId: this.businessId });
    await this.db.insert(customerGroups).values(group as CustomerGroup);

    await this.queueSync("insert", id, {
      name: input.name,
    }, syncGroupId);

    const created = await this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.id, id))
      .limit(1);

    if (created.length === 0) {
      throw new Error("Failed to create customer group");
    }

    return created[0];
  }

  /**
   * Create a group with initial members atomically
   * Uses syncGroupId to ensure group and members are synced together
   */
  async createWithMembers(input: CreateCustomerGroupInput, customerIds: string[]): Promise<CustomerGroup> {
    const syncGroupId = this.generateSyncGroup();

    await this.create(input, syncGroupId);

    const groups = await this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.name, input.name))
      .limit(1);

    if (groups.length === 0) {
      throw new Error("Failed to create customer group");
    }

    if (customerIds.length > 0) {
      await this.addMembers(groups[0].id, customerIds, syncGroupId);
    }

    return groups[0];
  }

  async update(id: string, input: UpdateCustomerGroupInput): Promise<CustomerGroup> {
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

    const updateData: Partial<CustomerGroup> = {
      name: input.name,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(this.now()),
    };

    await this.db
      .update(customerGroups)
      .set(updateData)
      .where(eq(customerGroups.id, id));

    await this.queueSync("update", id, {
      name: input.name,
    });

    const updated = await this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.id, id))
      .limit(1);

    if (updated.length === 0) {
      throw new Error(`Failed to update customer group: ${id}`);
    }

    return updated[0];
  }

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
      await this.queueSync("delete", member.id, {}, undefined, "customer_group_members");
    }

    await this.db
      .delete(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, id));

    await this.db
      .delete(customerGroups)
      .where(eq(customerGroups.id, id));

    await this.queueSync("delete", id, {});
  }

  async addMembers(groupId: string, customerIds: string[], syncGroupId?: string): Promise<void> {
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

    for (let i = 0; i < newCustomerIds.length; i++) {
      await this.queueSync("insert", memberIds[i], {
        groupId,
        customerId: newCustomerIds[i],
      }, syncGroupId, "customer_group_members");
    }
  }

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
