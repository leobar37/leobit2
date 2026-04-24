/**
 * Base Service
 * Abstract base class for entity services providing common functionality
 * for local-first operations with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { isSyncEntity, SyncStatus } from "@avileo/shared";
import type { EnqueueParams, SyncWritePort } from "@avileo/drizzle-sync/client";
import { VALID_TABLES } from "@avileo/drizzle-sync/pglite";
import { generateId } from "~/lib/utils/id-generator";
import { toLocalISOString } from "~/lib/date-utils";
import { formatCurrency, formatWeight } from "~/lib/utils";

export interface SyncClientEngineLike {
  getPg(): PGlite;
  getDb(): ReturnType<typeof drizzle>;
  getSyncOperations(): SyncWritePort | null;
  getConfig(): { tenantId: string; userId: string };
  /** Drizzle ORM tables exposed by the engine */
  tables: Record<string, unknown>;
}

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
 * Uses VALID_TABLES from schema-mapper as the single source of truth,
 * plus local-only tables that don't sync.
 */
const VALID_TABLE_NAMES: readonly string[] = [
  ...Array.from(VALID_TABLES),
  "inventory", // LOCAL-ONLY: frontend table/service usage, not in shared SYNC_ENTITIES
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
  protected readonly engine: SyncClientEngineLike;

  constructor(engine: SyncClientEngineLike) {
    this.engine = engine;
  }

  protected get pg(): PGlite {
    return this.engine.getPg();
  }

  protected get db(): ReturnType<typeof drizzle> {
    return this.engine.getDb();
  }

  protected get syncService(): SyncWritePort {
    return this.engine.getSyncOperations()!;
  }

  protected get tenantId(): string {
    return this.engine.getConfig().tenantId;
  }

  protected get userId(): string {
    return this.engine.getConfig().userId;
  }

  protected get businessId(): string {
    return this.tenantId;
  }

  protected get businessUserId(): string {
    return this.userId;
  }

  /**
    * Drizzle ORM tables exposed by the engine.
    * Use this to access schema tables without importing from @avileo/shared.
    *
    * @example
    * ```typescript
    * const result = await this.db.select().from(this.tables.customers).where(eq(this.tables.customers.id, id));
    * ```
    */
  protected get tables(): Record<string, unknown> {
    return this.engine.tables;
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
   * Returns current timestamp as ISO string in UTC
   * Uses toLocalISOString() to ensure consistent UTC date handling across frontend and backend
   */
  protected now(): string {
    return toLocalISOString();
  }

  /**
   * Queues a sync operation for later processing
   * @param action - The type of sync action (insert, update, delete)
   * @param entityId - The ID of the entity being synced
   * @param payload - The data to sync
   * @param entityTypeOverride - Optional override for entity type (e.g., sale_items for items)
   * @param entityVersion - Optional entity version for conflict detection (defaults to 1)
   */
  protected async queueSync(
    action: SyncAction,
    entityId: string,
    payload: Record<string, unknown>,
    entityTypeOverride?: EntityType,
    entityVersion?: number,
    options?: {
      idempotencyKey?: string;
    }
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
      idempotencyKey: options?.idempotencyKey ?? generateId(),
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

  /**
   * Normalizes monetary values to string with 2 decimal places.
   * PGlite DECIMAL columns can return as number (via Drizzle ORM) or string (via raw SQL).
   * Always converts to string for consistency across the service layer.
   */
  protected normalizeCurrency(value: string | number | null | undefined): string {
    return formatCurrency(value);
  }

  /**
   * Normalizes weight values to string with 3 decimal places.
   * Returns null if the input is null/undefined (nullable weight columns).
   */
  protected normalizeWeight(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return formatWeight(value);
  }

  /**
   * Normalizes weight values to string with 3 decimal places.
   * Returns "0.000" if the input is null/undefined (for required weight columns).
   */
  protected normalizeWeightRequired(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "0.000";
    return formatWeight(value);
  }

  /**
   * Normalizes a nullable monetary value.
   * Returns null if the input is null/undefined, otherwise a formatted string.
   */
  protected normalizeNullableCurrency(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return formatCurrency(value);
  }
}
