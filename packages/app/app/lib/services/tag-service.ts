/**
 * Tag Service
 * Local-first tag entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc, sql } from "drizzle-orm";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, tags, customerTags, type Tag } from "@avileo/shared";

/** Input for creating a new tag */
export interface CreateTagInput {
  name: string;
  color?: string;
}

/** Input for updating an existing tag */
export interface UpdateTagInput {
  name?: string;
  color?: string;
}

/**
 * Tag Service
 * Provides CRUD operations for tags with local-first approach
 * and automatic sync to server
 */
export class TagService extends BaseService {
  private static readonly TABLE_NAME = "tags";
  private static readonly ENTITY_TYPE: EntityType = "tags";
  private static readonly ID_PREFIX = "tag";

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
    return TagService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return TagService.ID_PREFIX;
  }

  /**
   * Find a tag by ID
   */
  async findById(id: string): Promise<Tag | null> {
    const result = await this.db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all tags for the current business
   */
  async findByBusiness(): Promise<Tag[]> {
    return this.db
      .select()
      .from(tags)
      .where(eq(tags.businessId, this.businessId))
      .orderBy(desc(tags.createdAt));
  }

  /**
   * Create a new tag
   * Stores locally and queues for server sync
   */
  async create(input: CreateTagInput): Promise<Tag> {
    const id = this.generateId();
    const now = this.now();

    const tag: Tag = {
      id,
      name: input.name,
      color: input.color || "#f97316",
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await this.db.insert(tags).values(tag);

    await this.queueSync("insert", id, {
      name: input.name,
      color: input.color,
    });

    return tag;
  }

  /**
   * Update an existing tag
   * Updates locally and queues for server sync
   */
  async update(id: string, input: UpdateTagInput): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Tag not found: ${id}`);
    }

    const now = this.now();
    const updateData: Partial<Tag> = {
      updatedAt: new Date(now),
      syncStatus: SyncStatus.PENDING,
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    await this.db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id));

    await this.queueSync("update", id, input as Record<string, unknown>);
  }

  /**
   * Delete a tag
   * Removes locally and queues deletion for server sync
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Tag not found: ${id}`);
    }

    await this.db
      .delete(tags)
      .where(eq(tags.id, id));

    await this.queueSync("delete", id, {});
  }

  /**
   * Get customer count for a tag
   */
  async getCustomerCount(tagId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerTags)
      .where(eq(customerTags.tagId, tagId));

    return result[0]?.count ?? 0;
  }
}
