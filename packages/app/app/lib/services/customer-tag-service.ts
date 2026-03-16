/**
 * Customer Tag Service
 * Local-first customer-tag assignment service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, customerTags, type CustomerTag } from "@avileo/shared";

/**
 * Customer Tag Service
 * Provides operations for assigning tags to customers with local-first approach
 * and automatic sync to server
 */
export class CustomerTagService extends BaseService {
  private static readonly TABLE_NAME = "customer_tags";
  private static readonly ENTITY_TYPE: EntityType = "customer_tags";

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
    return CustomerTagService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return "ct";
  }

  /**
   * Get all tags for a customer
   */
  async getCustomerTags(customerId: string): Promise<CustomerTag[]> {
    return this.db
      .select()
      .from(customerTags)
      .where(eq(customerTags.customerId, customerId));
  }

  /**
   * Get all customers with a specific tag
   */
  async getCustomersByTag(tagId: string): Promise<string[]> {
    const result = await this.db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(eq(customerTags.tagId, tagId));

    return result.map((r) => r.customerId);
  }

  /**
   * Assign tags to a customer (replaces existing tags)
   */
  async assignTags(customerId: string, tagIds: string[]): Promise<void> {
    // First, remove all existing tags for this customer
    await this.db
      .delete(customerTags)
      .where(eq(customerTags.customerId, customerId));

    // Then, insert new assignments if any
    if (tagIds.length > 0) {
      const now = new Date().toISOString();

      for (const tagId of tagIds) {
        const id = this.generateId();

        await this.db.insert(customerTags).values({
          customerId,
          tagId,
          assignedAt: new Date(now),
          assignedBy: null,
          syncStatus: SyncStatus.PENDING,
          syncAttempts: 0,
        });

        await this.queueSync("insert", id, {
          customerId,
          tagId,
        });
      }
    }
  }

  /**
   * Add a single tag to a customer
   */
  async addTag(customerId: string, tagId: string): Promise<void> {
    // Check if already assigned
    const existing = await this.db
      .select()
      .from(customerTags)
      .where(
        and(
          eq(customerTags.customerId, customerId),
          eq(customerTags.tagId, tagId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return; // Already assigned
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.insert(customerTags).values({
      customerId,
      tagId,
      assignedAt: new Date(now),
      assignedBy: null,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
    });

    await this.queueSync("insert", id, {
      customerId,
      tagId,
    });
  }

  /**
   * Remove a single tag from a customer
   */
  async removeTag(customerId: string, tagId: string): Promise<void> {
    await this.db
      .delete(customerTags)
      .where(
        and(
          eq(customerTags.customerId, customerId),
          eq(customerTags.tagId, tagId)
        )
      );

    await this.queueSync("delete", `${customerId}_${tagId}`, {
      customerId,
      tagId,
    });
  }

  /**
   * Bulk assign tags to multiple customers
   */
  async bulkAssignTags(customerIds: string[], tagIds: string[]): Promise<void> {
    if (customerIds.length === 0) return;

    const now = new Date().toISOString();
    const syncGroupId = this.generateSyncGroup();

    for (const customerId of customerIds) {
      // Remove existing tags
      await this.db
        .delete(customerTags)
        .where(eq(customerTags.customerId, customerId));

      // Add new tags
      for (const tagId of tagIds) {
        const id = this.generateId();

        await this.db.insert(customerTags).values({
          customerId,
          tagId,
          assignedAt: new Date(now),
          assignedBy: null,
          syncStatus: SyncStatus.PENDING,
          syncAttempts: 0,
        });

        await this.queueSync(
          "insert",
          id,
          {
            customerId,
            tagId,
          },
          syncGroupId
        );
      }
    }
  }

  /**
   * Check if a customer has a specific tag
   */
  async hasTag(customerId: string, tagId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(customerTags)
      .where(
        and(
          eq(customerTags.customerId, customerId),
          eq(customerTags.tagId, tagId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get all customer-tag mappings for the current business
   */
  async getAllCustomerTags(): Promise<CustomerTag[]> {
    return this.db.select().from(customerTags);
  }
}
