/**
 * Tag Service
 * 
 * This file extends the generated TagsService from drizzle-sync
 * to preserve the custom getCustomerCount method while leveraging
 * the generated CRUD operations.
 * 
 * Generated at: 2026-04-19
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { customerTags } from "@avileo/shared";

// Import the generated TagsService and its input types
import { 
  TagsService, 
  type CreateTagsInput, 
  type UpdateTagsInput
} from "~/lib/sync/generated/services";
import type { SyncWritePort } from "@avileo/drizzle-sync/client";

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
   * Get customer count for a tag
   * Custom method not generated - preserved from original implementation
   */
  async getCustomerCount(tagId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerTags)
      .where(eq(customerTags.tagId, tagId));

    return result[0]?.count ?? 0;
  }
}
