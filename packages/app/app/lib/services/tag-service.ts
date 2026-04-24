/**
 * Tag Service
 * 
 * This file extends the generated TagsService from drizzle-sync
 * to preserve the custom getCustomerCount method while leveraging
 * the generated CRUD operations.
 * 
 * Generated at: 2026-04-19
 */

import type { SyncClientEngineLike } from "./base-service";
import { eq, sql } from "drizzle-orm";
// this.tables.customerTags is now accessed via this.tables

// Import the generated TagsService and its input types
import { 
  TagsService, 
  type CreateTagsInput, 
  type UpdateTagsInput
} from "~/lib/sync/generated/services";

// Re-export input types with the original names for backward compatibility
export type CreateTagInput = CreateTagsInput;
export type UpdateTagInput = UpdateTagsInput;

/**
 * Tag Service
 * Extends the generated TagsService with custom business methods.
 * 
 * Preserved custom methods:
 * - getCustomerCount(tagId: string): Promise<number> - Get number of customers with this tag
 */
export class TagService extends TagsService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }

  /**
   * Get customer count for a tag
   * Custom method not generated - preserved from original implementation
   */
  async getCustomerCount(tagId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.tables.customerTags)
      .where(eq(this.tables.customerTags.tagId, tagId));

    return result[0]?.count ?? 0;
  }
}
