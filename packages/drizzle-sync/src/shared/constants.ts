/**
 * Shared Sync Constants
 *
 * Common constants for sync operations, status values, and configuration.
 */

// ============================================================================
// Operation Status Values
// ============================================================================

/**
 * Operation status values
 */
export const OPERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SYNCING: "syncing",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
  DEAD_LETTER: "dead_letter",
} as const;

/**
 * Operation status type
 */
export type OperationStatus =
  (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];

// ============================================================================
// Conflict Resolution Strategies
// ============================================================================

/**
 * Conflict resolution strategies
 */
export const CONFLICT_STRATEGY = {
  SERVER_WINS: "server-wins",
  CLIENT_WINS: "client-wins",
  FIELD_MERGE: "field-merge",
  MANUAL: "manual",
} as const;

/**
 * Conflict strategy type
 */
export type ConflictStrategy =
  (typeof CONFLICT_STRATEGY)[keyof typeof CONFLICT_STRATEGY];

// ============================================================================
// Syncable Entities
// ============================================================================

/**
 * Syncable entity types
 */
export const SYNCABLE_ENTITIES = {
  CUSTOMERS: "customers",
  SALES: "sales",
  SALE_ITEMS: "sale_items",
  ABONOS: "abonos",
  DISTRIBUCIONES: "distribuciones",
  PRODUCTS: "products",
  PRODUCT_VARIANTS: "product_variants",
  TAGS: "tags",
  CUSTOMER_TAGS: "customer_tags",
  PURCHASES: "purchases",
  PURCHASE_ITEMS: "purchase_items",
  CUSTOMER_GROUPS: "customer_groups",
  CUSTOMER_GROUP_MEMBERS: "customer_group_members",
  VISITAS: "visitas",
  SUPPLIERS: "suppliers",
} as const;

/**
 * Syncable entity type
 */
export type SyncableEntity =
  (typeof SYNCABLE_ENTITIES)[keyof typeof SYNCABLE_ENTITIES];

// ============================================================================
// Default Sync Configuration
// ============================================================================

/**
 * Default sync configuration constants
 */
export const MAX_RETRIES = 5;
export const BATCH_SIZE = 100;
export const SYNC_INTERVAL_MS = 5000;
export const PULL_INTERVAL_MS = 10000;
export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MAX_MS = 30000;
export const BACKOFF_MULTIPLIER = 2;
export const CONCURRENT_OPERATIONS = 5;
export const BATCH_TIMEOUT_MS = 60000;
export const DLQ_MAX_SIZE = 1000;
export const MAX_STALE_PULLS = 3;
export const MAX_EMPTY_PULLS = 5;

/**
 * Default sync configuration object (for backwards compatibility)
 */
export const DEFAULT_SYNC_CONFIG = {
  MAX_RETRIES,
  BATCH_SIZE,
  SYNC_INTERVAL_MS,
  PULL_INTERVAL_MS,
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_MULTIPLIER,
  CONCURRENT_OPERATIONS,
  BATCH_TIMEOUT_MS,
  DLQ_MAX_SIZE,
  MAX_STALE_PULLS,
  MAX_EMPTY_PULLS,
} as const;

// ============================================================================
// Pull Sync Stages
// ============================================================================

/**
 * Pull sync stages
 */
export const PULL_STAGES = {
  /** Critical entities (customers, products) */
  CRITICAL: "critical",
  /** Recent sales data */
  RECENT_SALES: "recent_sales",
  /** Historical data */
  HISTORICAL: "historical",
} as const;

/**
 * Pull stage type
 */
export type PullStage = (typeof PULL_STAGES)[keyof typeof PULL_STAGES];

// ============================================================================
// Sync Event Types
// ============================================================================

/**
 * Sync event types
 */
export const SYNC_EVENTS = {
  /** Sync started */
  SYNC_STARTED: "sync:started",
  /** Sync completed */
  SYNC_COMPLETED: "sync:completed",
  /** Sync failed */
  SYNC_FAILED: "sync:failed",
  /** Pull stale detected */
  PULL_STALE: "pull:stale",
  /** Online status changed */
  ONLINE_CHANGED: "online:changed",
  /** Queue changed */
  QUEUE_CHANGED: "queue:changed",
} as const;

/**
 * Sync event type
 */
export type SyncEvent = (typeof SYNC_EVENTS)[keyof typeof SYNC_EVENTS];
