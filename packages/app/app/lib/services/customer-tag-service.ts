/**
 * Customer Tag Service
 * 
 * This file extends the generated CustomerTagsService from drizzle-sync
 * to preserve the custom tag assignment methods while leveraging
 * the generated CRUD operations.
 * 
 * Generated at: 2026-04-19
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import { SyncService } from "~/lib/sync/sync-service";
import { customerTags, type CustomerTag } from "@avileo/shared";

// Import the generated CustomerTagsService and its input types
import { 
  CustomerTagsService, 
  type CreateCustomerTagsInput 
} from "~/lib/sync/generated/services";

// Re-export input types for backward compatibility
export type CreateCustomerTagInput = CreateCustomerTagsInput;

/**
 * Customer Tag Service
 * Extends the generated CustomerTagsService with custom tag assignment methods.
 */
export class CustomerTagService extends CustomerTagsService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
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
      const now = this.now();

      for (const tagId of tagIds) {
        const id = this.generateId();

        await this.db.insert(customerTags).values({
          customerId,
          tagId,
        });

        await this.queueSync("create", id, {
          customerId,
          tagId,
        } as Record<string, unknown>);
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

    await this.db.insert(customerTags).values({
      customerId,
      tagId,
    });

    await this.queueSync("create", id, {
      customerId,
      tagId,
    } as Record<string, unknown>);
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
    } as Record<string, unknown>);
  }

  /**
   * Bulk assign tags to multiple customers
   */
  async bulkAssignTags(customerIds: string[], tagIds: string[]): Promise<void> {
    if (customerIds.length === 0) return;

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
        });

        // FK references (customerId/tagId) in payload establish the relationship
        // No syncGroupId needed - operations are independent per customer-tag pair
        await this.queueSync("create", id, {
          customerId,
          tagId,
        } as Record<string, unknown>);
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
