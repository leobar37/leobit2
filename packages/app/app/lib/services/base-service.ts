/**
 * Base Service
 * Abstract base class for entity services providing common functionality
 * for local-first operations with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService, type EnqueueParams } from "../sync/sync-service";
import { runSyncHooks } from "../sync/registry";
import { SyncStatus } from "@avileo/shared";
import { generateId } from "~/lib/utils/id-generator";
import { toLocalISOString } from "~/lib/date-utils";

/** Entity types supported by services */
export type EntityType =
  | "customers"
  | "sales"
  | "sale_items"
  | "abonos"
  | "products"
  | "product_variants"
  | "suppliers"
  | "purchases"
  | "purchase_items"
  | "distribuciones"
  | "distribucion_items"
  | "tags"
  | "customer_tags"
  | "inventory"
  | "variant_inventory"
  | "visitas"
  | "customer_groups"
  | "customer_group_members";

/** Valid table names that can be used in SQL queries */
const VALID_TABLE_NAMES: readonly string[] = [
  "customers",
  "sales",
  "sale_items",
  "abonos",
  "products",
  "product_variants",
  "suppliers",
  "purchases",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "tags",
  "customer_tags",
  "inventory",
  "variant_inventory",
  "visitas",
  "customer_groups",
  "customer_group_members",
] as const;

/** Sync action types */
export type SyncAction = "create" | "update" | "delete";

/** Base input for create operations */
export interface BaseCreateInput {
  [key: string]: unknown;
}

/** Base input for update operations */
export interface BaseUpdateInput {
  [key: string]: unknown;
}

/**
 * Validates that a table name is in the allowed list
 * This prevents SQL injection when table names must be used in queries
 */
function validateTableName(tableName: string): string {
  if (!VALID_TABLE_NAMES.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}

/**
 * Abstract base service class providing common functionality
 * for all entity services
 */
export abstract class BaseService {
  protected readonly pg: PGlite;
  protected readonly db: ReturnType<typeof drizzle>;
  protected readonly syncService: SyncService;
  protected readonly businessId: string;
  protected readonly businessUserId: string;

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    this.pg = pg;
    this.db = db;
    this.syncService = syncService;
    this.businessId = businessId;
    this.businessUserId = businessUserId;
  }

  /**
   * Returns the entity type for this service
   * Must be implemented by subclasses
   */
  abstract getEntityType(): EntityType;

  /**
   * Returns the ID prefix for this entity
   * Used for generating UUIDs with meaningful prefixes
   * Must be implemented by subclasses
   */
  abstract getEntityPrefix(): string;

  /**
   * Generates a pure UUID v4 compatible with backend PostgreSQL
   * Previously used prefixed format but backend expects standard UUID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Returns current timestamp as ISO string in local timezone
   * Uses toLocalISOString() to ensure dates are stored in the user's local timezone (Peru UTC-5)
   */
  protected now(): string {
    return toLocalISOString();
  }

  /**
   * Generates a group ID for atomic operations
   * Used to group multiple related operations together
   */
  protected generateSyncGroup(): string {
    return crypto.randomUUID();
  }

  /**
   * Queues a sync operation for later processing
   * @param action - The type of sync action (insert, update, delete)
   * @param entityId - The ID of the entity being synced
   * @param payload - The data to sync
   * @param syncGroupId - Optional group ID for atomic operations
   * @param entityTypeOverride - Optional override for entity type (e.g., sale_items for items)
   */
  protected async queueSync(
    action: SyncAction,
    entityId: string,
    payload: Record<string, unknown>,
    syncGroupId?: string,
    entityTypeOverride?: EntityType
  ): Promise<void> {
    // Run sync hooks before enqueueing
    const entityType = entityTypeOverride ?? this.getEntityType();
    const hookResult = await runSyncHooks(
      entityType,
      {
        operation: action,
        entityId,
        data: payload,
      },
      {
        pg: this.pg,
        businessId: this.businessId,
      }
    );

    if (!hookResult.allow) {
      console.log(`[SyncHook] Skipping sync for ${entityType}:${entityId} - ${hookResult.reason}`);
      return;
    }

    const params: EnqueueParams = {
      entity_type: entityType,
      operation: action,
      entityId,
      data: payload,
      idempotencyKey: generateId(),
      syncGroupId,
    };

    await this.syncService.enqueue(params);
  }

  /**
   * Updates the sync status of an entity
   */
  protected async updateSyncStatus(
    tableName: string,
    id: string,
    status: (typeof SyncStatus)[keyof typeof SyncStatus]
  ): Promise<void> {
    const validatedTableName = validateTableName(tableName);
    const now = this.now();
    await this.pg.exec(
      `UPDATE ${validatedTableName} SET sync_status = $1, updated_at = $2 WHERE id = $3`,
      [status, now, id]
    );
  }

  /**
   * Increments the sync version of an entity
   * Used for optimistic locking
   */
  protected async incrementSyncVersion(
    tableName: string,
    id: string
  ): Promise<number> {
    const validatedTableName = validateTableName(tableName);

    const result = await this.pg.query<{ version: string }>(
      `SELECT version FROM ${validatedTableName} WHERE id = $1`,
      [id]
    );

    const currentVersion = result.rows[0]?.version
      ? parseInt(result.rows[0].version, 10)
      : 1;
    const newVersion = currentVersion + 1;

    const now = this.now();
    await this.pg.exec(
      `UPDATE ${validatedTableName} SET version = $1, sync_status = $2, updated_at = $3 WHERE id = $4`,
      [newVersion, SyncStatus.PENDING, now, id]
    );

    return newVersion;
  }

  /**
   * Gets the business ID for this service instance
   */
  protected getBusinessId(): string {
    return this.businessId;
  }
}
