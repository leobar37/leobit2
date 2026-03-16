/**
 * Sync Configuration
 * Constants and configuration for the sync engine
 */

/** Maximum number of retry attempts for failed operations */
export const MAX_RETRIES = 5;

/** Maximum number of operations to process in a single batch */
export const BATCH_SIZE = 50;

/** Interval in milliseconds between sync cycles */
export const SYNC_INTERVAL_MS = 30000;

/** Interval in milliseconds between pull sync cycles (server to client) */
export const PULL_INTERVAL_MS = 10000;

/** Base delay for exponential backoff in milliseconds */
export const BACKOFF_BASE_MS = 1000;

/** Maximum delay for exponential backoff in milliseconds */
export const BACKOFF_MAX_MS = 30000;

/** Delay multiplier for exponential backoff */
export const BACKOFF_MULTIPLIER = 2;

/** Number of operations to process concurrently */
export const CONCURRENT_OPERATIONS = 5;

/** Timeout for a single batch sync request in milliseconds */
export const BATCH_TIMEOUT_MS = 60000;

/** Dead letter queue maximum size */
export const DLQ_MAX_SIZE = 1000;

/** Operation status values */
export const OPERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SYNCING: "syncing",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
  DEAD_LETTER: "dead_letter",
} as const;

/** Entity types that can be synced */
export const SYNCABLE_ENTITIES = [
  "customers",
  "sales",
  "sale_items",
  "abonos",
  "distribuciones",
  "variant_inventory",
  "closings",
  "orders",
  "order_items",
  "files",
  "assets",
  "suppliers",
  "purchases",
  "purchase_items",
  "customer_groups",
  "customer_group_members",
  "visitas",
] as const;

/** Conflict resolution strategies */
export const CONFLICT_STRATEGY = {
  SERVER_WINS: "server-wins",
  CLIENT_WINS: "client-wins",
  FIELD_MERGE: "field-merge",
  MANUAL: "manual",
} as const;

export type OperationStatus = (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];
export type SyncableEntity = (typeof SYNCABLE_ENTITIES)[number];
export type ConflictStrategy = (typeof CONFLICT_STRATEGY)[keyof typeof CONFLICT_STRATEGY];
