/**
 * Customer Service
 * Local-first customer entity service with automatic sync integration
 * Extends generated CustomersService to preserve custom search/filter logic
 */

import type { SyncClientEngineLike } from "./base-service";
import { CustomersService, type CreateCustomersInput, type UpdateCustomersInput } from "~/lib/sync/generated/services";
import { SyncStatus, type Customers as Customer } from "~/lib/sync/generated/schema";
import { eq, like, and, or, desc, isNotNull, inArray, sql } from "drizzle-orm";

// Re-export types for backward compatibility
export type { CreateCustomersInput as CreateCustomerInput, UpdateCustomersInput as UpdateCustomerInput } from "~/lib/sync/generated/services";

/** Search filters for finding this.tables.customers */
export interface CustomerSearchFilters {
  search?: string;
  hasDni?: boolean;
  hasPhone?: boolean;
  tagIds?: string[];
  groupIds?: string[];
}

export interface CustomerPageQuery extends CustomerSearchFilters {
  limit: number;
  offset: number;
}

export interface CustomerListPage {
  items: Customer[];
  total: number;
}

export interface CustomerTagSummary {
  customerId: string;
  tagId: string;
  tagName: string;
  tagColor: string;
}

/**
 * Customer Service
 * Extends generated CustomersService to preserve custom search/filter logic
 * including tag filtering, group filtering, and pagination
 */
export class CustomerService extends CustomersService {
  private buildFilterConditions(filters?: CustomerSearchFilters) {
    const conditions = [eq(this.tables.customers.businessId, this.businessId)];

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(this.tables.customers.name, searchPattern),
          like(this.tables.customers.dni, searchPattern),
          like(this.tables.customers.phone, searchPattern)
        ) as never
      );
    }

    if (filters?.hasDni === true) {
      conditions.push(isNotNull(this.tables.customers.dni) as never);
    }

    if (filters?.hasPhone === true) {
      conditions.push(isNotNull(this.tables.customers.phone) as never);
    }

    return conditions;
  }

  private async filterCustomerIdsByTags(tagIds: string[]): Promise<string[] | null> {
    if (tagIds.length === 0) {
      return null;
    }

    const rows = await this.db
      .select({ customerId: this.tables.customerTags.customerId })
      .from(this.tables.customerTags)
      .innerJoin(this.tables.customers, eq(this.tables.customerTags.customerId, this.tables.customers.id))
      .where(
        and(
          eq(this.tables.customers.businessId, this.businessId),
          inArray(this.tables.customerTags.tagId, tagIds)
        )
      )
      .groupBy(this.tables.customerTags.customerId)
      .having(sql`count(distinct ${this.tables.customerTags.tagId}) = ${tagIds.length}`);

    return rows.map((row) => row.customerId);
  }

  private async filterCustomerIdsByGroups(groupIds: string[]): Promise<string[] | null> {
    if (groupIds.length === 0) {
      return null;
    }

    const rows = await this.db
      .selectDistinct({ customerId: this.tables.customerGroupMembers.customerId })
      .from(this.tables.customerGroupMembers)
      .innerJoin(this.tables.customers, eq(this.tables.customerGroupMembers.customerId, this.tables.customers.id))
      .where(
        and(
          eq(this.tables.customers.businessId, this.businessId),
          eq(this.tables.customerGroupMembers.businessId, this.businessId),
          inArray(this.tables.customerGroupMembers.groupId, groupIds)
        )
      );

    return rows.map((row) => row.customerId);
  }

  private async resolveFilteredCustomerIds(filters?: CustomerSearchFilters): Promise<string[] | null> {
    const [tagFilteredIds, groupFilteredIds] = await Promise.all([
      this.filterCustomerIdsByTags(filters?.tagIds ?? []),
      this.filterCustomerIdsByGroups(filters?.groupIds ?? []),
    ]);

    if (tagFilteredIds && tagFilteredIds.length === 0) {
      return [];
    }

    if (groupFilteredIds && groupFilteredIds.length === 0) {
      return [];
    }

    if (!tagFilteredIds && !groupFilteredIds) {
      return null;
    }

    if (tagFilteredIds && groupFilteredIds) {
      const groupSet = new Set(groupFilteredIds);
      return tagFilteredIds.filter((customerId) => groupSet.has(customerId));
    }

    return tagFilteredIds ?? groupFilteredIds;
  }

  /**
   * Find all this.tables.customers for the current business with optional filters
   * Overrides parent to add tag/group filtering and search
   */
  async findByBusiness(filters?: CustomerSearchFilters): Promise<Customer[]> {
    const filteredIds = await this.resolveFilteredCustomerIds(filters);
    if (filteredIds && filteredIds.length === 0) {
      return [];
    }

    const conditions = this.buildFilterConditions(filters);

    if (filteredIds) {
      conditions.push(inArray(this.tables.customers.id, filteredIds) as never);
    }

    const result = await this.db
      .select()
      .from(this.tables.customers)
      .where(and(...conditions))
      .orderBy(desc(this.tables.customers.createdAt));

    return result as Customer[];
  }

  async countByBusiness(filters?: CustomerSearchFilters): Promise<number> {
    const filteredIds = await this.resolveFilteredCustomerIds(filters);
    if (filteredIds && filteredIds.length === 0) {
      return 0;
    }

    const conditions = this.buildFilterConditions(filters);

    if (filteredIds) {
      conditions.push(inArray(this.tables.customers.id, filteredIds) as never);
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.tables.customers)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async findPageByBusiness(query: CustomerPageQuery): Promise<CustomerListPage> {
    const filteredIds = await this.resolveFilteredCustomerIds(query);
    if (filteredIds && filteredIds.length === 0) {
      return { items: [], total: 0 };
    }

    const conditions = this.buildFilterConditions(query);

    if (filteredIds) {
      conditions.push(inArray(this.tables.customers.id, filteredIds) as never);
    }

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(this.tables.customers)
        .where(and(...conditions))
        .orderBy(desc(this.tables.customers.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.tables.customers)
        .where(and(...conditions)),
    ]);

    return {
      items: items as Customer[],
      total: totalResult[0]?.count ?? 0,
    };
  }

  async getCustomerTagsForCustomers(customerIds: string[]): Promise<CustomerTagSummary[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const result = await this.db
      .select({
        customerId: this.tables.customerTags.customerId,
        tagId: this.tables.customerTags.tagId,
        tagName: this.tables.tags.name,
        tagColor: this.tables.tags.color,
      })
      .from(this.tables.customerTags)
      .innerJoin(this.tables.tags, eq(this.tables.customerTags.tagId, this.tables.tags.id))
      .where(inArray(this.tables.customerTags.customerId, customerIds));

    return result;
  }

  /**
   * Create a new customer
   * Overrides parent to set createdBy to businessUserId and include proper timestamps
   */
  async create(input: CreateCustomersInput): Promise<Customer> {
    const id = this.generateId();
    const now = this.now();

    const entity: typeof this.tables.customers.$inferInsert = {
      id,
      name: input.name,
      dni: input.dni ?? undefined,
      phone: input.phone ?? undefined,
      address: input.address ?? undefined,
      notes: input.notes ?? undefined,
      createdBy: this.businessUserId,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await this.db.insert(this.tables.customers).values(entity);

    await this.queueSync("create", id, {
      name: input.name,
      dni: input.dni,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
      createdBy: this.businessUserId,
    });

    return entity as Customer;
  }
}
