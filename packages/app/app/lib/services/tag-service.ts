/**
 * Tag Service
 * Local-first tag entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, type Tag } from "@avileo/shared";

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

  constructor(pg: PGlite, syncService: SyncService, businessId: string) {
    super(pg, syncService, businessId);
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
    const result = await this.pg.query<Tag>(
      `SELECT * FROM ${TagService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find all tags for the current business
   */
  async findByBusiness(): Promise<Tag[]> {
    const query = `SELECT * FROM ${TagService.TABLE_NAME} WHERE business_id = $1 ORDER BY created_at DESC`;

    const result = await this.pg.query<Tag>(query, [this.businessId]);
    return result.rows;
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

    await this.pg.exec(
      `INSERT INTO ${TagService.TABLE_NAME} (
        id, name, color,
        sync_status, sync_attempts, business_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tag.id,
        tag.name,
        tag.color,
        tag.syncStatus,
        tag.syncAttempts,
        tag.businessId,
        tag.createdAt,
        tag.updatedAt,
      ]
    );

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

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      params.push(input.color);
    }

    const now = this.now();
    updates.push(`sync_status = $${paramIndex++}`);
    params.push(SyncStatus.PENDING);

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add id as last parameter
    params.push(id);

    await this.pg.exec(
      `UPDATE ${TagService.TABLE_NAME} SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

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

    await this.pg.exec(
      `DELETE FROM ${TagService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    await this.queueSync("delete", id, {});
  }

  /**
   * Get customer count for a tag
   */
  async getCustomerCount(tagId: string): Promise<number> {
    const result = await this.pg.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM customer_tags WHERE tag_id = $1`,
      [tagId]
    );

    return parseInt(result.rows[0]?.count || "0", 10);
  }
}
