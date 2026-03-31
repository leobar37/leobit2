/**
 * Base Service
 * Abstract base class for entity services providing common functionality
 * for local-first operations with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { isSyncEntity, SyncStatus } from "@avileo/shared";
import { SyncService, type EnqueueParams } from "../sync/sync-service";
import { generateId } from "~/lib/utils/id-generator";
import { toLocalISOString } from "~/lib/date-utils";

/**
 * Entity types referenced by frontend base services.
 *
 * Classification:
 * - Most entries are canonical and match `@avileo/shared` `SYNC_ENTITIES`.
 * - `inventory` is LOCAL-ONLY frontend state.
 * - `variant_inventory` is a LEGACY frontend entity that no longer belongs to the canonical sync API.
 */
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
  | "inventory" // LOCAL-ONLY: frontend service/devtools entity, not in shared SYNC_ENTITIES
  | "variant_inventory" // LEGACY: deprecated frontend entity, not in shared SYNC_ENTITIES
  | "visitas"
  | "customer_groups"
  | "customer_group_members";

/**
 * SQL table-name safety allowlist for frontend services.
 *
 * Classification:
 * - Canonical entries match `@avileo/shared` `SYNC_ENTITIES`.
 * - `inventory` is LOCAL-ONLY frontend state.
 * - `variant_inventory` is LEGACY and retained here for compatibility/safety.
 */
const VALID_TABLE_NAMES: readonly string[] = [
  "customers", // CANONICAL: shared SYNC_ENTITIES
  "sales", // CANONICAL: shared SYNC_ENTITIES
  "sale_items", // CANONICAL: shared SYNC_ENTITIES
  "abonos", // CANONICAL: shared SYNC_ENTITIES
  "products", // CANONICAL: shared SYNC_ENTITIES
  "product_variants", // CANONICAL: shared SYNC_ENTITIES
  "suppliers", // CANONICAL: shared SYNC_ENTITIES
  "purchases", // CANONICAL: shared SYNC_ENTITIES
  "purchase_items", // CANONICAL: shared SYNC_ENTITIES
  "distribuciones", // CANONICAL: shared SYNC_ENTITIES
  "distribucion_items", // CANONICAL: shared SYNC_ENTITIES
  "tags", // CANONICAL: shared SYNC_ENTITIES
  "customer_tags", // CANONICAL: shared SYNC_ENTITIES
  "inventory", // LOCAL-ONLY: frontend table/service usage, not in shared SYNC_ENTITIES
  "variant_inventory", // LEGACY: deprecated frontend table kept in validation allowlist
  "visitas", // CANONICAL: shared SYNC_ENTITIES
  "customer_groups", // CANONICAL: shared SYNC_ENTITIES
  "customer_group_members", // CANONICAL: shared SYNC_ENTITIES
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
   * @param entityVersion - Optional entity version for conflict detection (defaults to 1)
   */
  protected async queueSync(
    action: SyncAction,
    entityId: string,
    payload: Record<string, unknown>,
    syncGroupId?: string,
    entityTypeOverride?: EntityType,
    entityVersion?: number
  ): Promise<void> {
    const entityType = entityTypeOverride ?? this.getEntityType();
    if (!isSyncEntity(entityType)) {
      throw new Error(`Invalid sync entity type: ${entityType}`);
    }

    const params: EnqueueParams = {
      entity_type: entityType,
      operation: action,
      entityId,
      data: {
        ...payload,
        ...(entityVersion !== undefined && { _localVersion: entityVersion }),
      },
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
    await this.pg.query(
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
    await this.pg.query(
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
