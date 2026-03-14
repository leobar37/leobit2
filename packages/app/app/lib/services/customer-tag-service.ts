/**
 * Customer Tag Service
 * Local-first customer-tag assignment service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, type CustomerTag } from "@avileo/shared";

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
    businessId: string
  ) {
    super(pg, db, syncService, businessId);
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
    const result = await this.pg.query<CustomerTag>(
      `SELECT * FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1`,
      [customerId]
    );

    return result.rows;
  }

  /**
   * Get all customers with a specific tag
   */
  async getCustomersByTag(tagId: string): Promise<string[]> {
    const result = await this.pg.query<{ customer_id: string }>(
      `SELECT customer_id FROM ${CustomerTagService.TABLE_NAME} WHERE tag_id = $1`,
      [tagId]
    );

    return result.rows.map(r => r.customer_id);
  }

  /**
   * Assign tags to a customer (replaces existing tags)
   */
  async assignTags(customerId: string, tagIds: string[]): Promise<void> {
    // First, remove all existing tags for this customer
    await this.pg.exec(
      `DELETE FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1`,
      [customerId]
    );

    // Then, insert new assignments if any
    if (tagIds.length > 0) {
      const now = new Date().toISOString();

      for (const tagId of tagIds) {
        const id = this.generateId();

        await this.pg.exec(
          `INSERT INTO ${CustomerTagService.TABLE_NAME} (
            customer_id, tag_id, assigned_at, assigned_by,
            sync_status, sync_attempts
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            customerId,
            tagId,
            now,
            null,
            SyncStatus.PENDING,
            0,
          ]
        );

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
    const existing = await this.pg.query<CustomerTag>(
      `SELECT * FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1 AND tag_id = $2`,
      [customerId, tagId]
    );

    if (existing.rows.length > 0) {
      return; // Already assigned
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.pg.exec(
      `INSERT INTO ${CustomerTagService.TABLE_NAME} (
        customer_id, tag_id, assigned_at, assigned_by,
        sync_status, sync_attempts
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        customerId,
        tagId,
        now,
        null,
        SyncStatus.PENDING,
        0,
      ]
    );

    await this.queueSync("insert", id, {
      customerId,
      tagId,
    });
  }

  /**
   * Remove a single tag from a customer
   */
  async removeTag(customerId: string, tagId: string): Promise<void> {
    await this.pg.exec(
      `DELETE FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1 AND tag_id = $2`,
      [customerId, tagId]
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
      await this.pg.exec(
        `DELETE FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1`,
        [customerId]
      );

      // Add new tags
      for (const tagId of tagIds) {
        const id = this.generateId();

        await this.pg.exec(
          `INSERT INTO ${CustomerTagService.TABLE_NAME} (
            customer_id, tag_id, assigned_at, assigned_by,
            sync_status, sync_attempts
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            customerId,
            tagId,
            now,
            null,
            SyncStatus.PENDING,
            0,
          ]
        );

        await this.queueSync("insert", id, {
          customerId,
          tagId,
        }, syncGroupId);
      }
    }
  }

  /**
   * Check if a customer has a specific tag
   */
  async hasTag(customerId: string, tagId: string): Promise<boolean> {
    const result = await this.pg.query<CustomerTag>(
      `SELECT 1 FROM ${CustomerTagService.TABLE_NAME} WHERE customer_id = $1 AND tag_id = $2`,
      [customerId, tagId]
    );

    return result.rows.length > 0;
  }
}
