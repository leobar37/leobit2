/**
 * Config Defaults
 * Centralized configuration values previously hardcoded in various files.
 */

/**
 * Default values for NOT NULL columns that may be missing from sync payloads.
 * When the backend stores the original client payload in sync_operations,
 * fields with server-side defaults are not included.
 * This map ensures the change-applier can still INSERT without NOT NULL violations.
 */
export const REQUIRED_COLUMN_DEFAULTS: Record<string, Record<string, unknown>> = {
  products: {
    base_price: "0",
    cost_price: "0",
  },
  product_variants: {
    price: "0",
    cost_price: "0",
    unit_quantity: "1",
  },
};

/**
 * Default conflict checking strategy
 */
export const DEFAULT_CONFLICT_STRATEGY = "pre-computed-set" as const;

/**
 * Default retry configuration for transient errors
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 100,
};

/**
 * Default batch processing configuration
 */
export const DEFAULT_BATCH_CONFIG = {
  checkConflicts: true,
  useTransaction: false,
};
