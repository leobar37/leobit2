/**
 * Storage Abstraction Types
 *
 * Provides a unified interface for all key-value storage operations
 * used by drizzle-sync. This decouples the library from localStorage
 * and allows consumers to provide custom implementations for
 * React Native, test environments, or other platforms.
 */

/**
 * Minimal key-value storage interface compatible with localStorage.
 */
export interface IKVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Well-known storage keys used by drizzle-sync internally.
 * Consumers can override these via StorageConfig.
 */
export const STORAGE_KEYS = {
  /** Schema hash version tracking */
  SCHEMA_HASH: "drizzle_sync_schema_hash",
  /** Force reset flag */
  FORCE_RESET: "DRIZZLE_SYNC_FORCE_RESET",
  /** Pull cursor base key */
  PULL_CURSOR: "drizzle_sync_pull_cursor",
} as const;

/**
 * Configuration for storage key generation.
 * All keys are prefixed with `prefix` and optionally namespaced.
 *
 * Key format: `{prefix}_{suffix}` or `{prefix}:{namespace}_{suffix}`
 *
 * @example
 * ```typescript
 * // Default: "drizzle_sync_schema_hash"
 * const config = { prefix: "drizzle_sync" };
 *
 * // Custom: "myapp_cursor"
 * const config = { prefix: "myapp" };
 *
 * // With namespace: "myapp:tenant-123_cursor"
 * const config = { prefix: "myapp", namespace: "tenant-123" };
 * ```
 */
export interface StorageKeyConfig {
  /**
   * Base prefix for all storage keys.
   * @default "drizzle_sync"
   */
  prefix?: string;

  /**
   * Namespace suffix for multi-tenancy isolation.
   * When provided, keys become `{prefix}:{namespace}_{suffix}`.
   */
  namespace?: string;

  /**
   * Override individual key names. When provided, these take
   * precedence over generated keys.
   */
  overrides?: Partial<Record<StorageKeyKind, string>>;
}

/**
 * Kinds of storage keys the library uses internally.
 */
export type StorageKeyKind =
  | "schemaHash"
  | "forceReset"
  | "pullCursor";

/**
 * Options for logout storage cleanup.
 */
export interface LogoutCleanupConfig {
  /**
   * Storage keys to clear on logout.
   * These are typically auth/session keys managed by the consumer app.
   * The library does NOT add defaults — the consumer must specify them.
   */
  authKeys?: string[];

  /**
   * Whether to clear sync-related keys (cursors, schema hash) on logout.
   * @default true
   */
  clearSyncKeys?: boolean;
}

/**
 * Combined storage configuration for SyncClientEngine.
 */
export interface StorageConfig {
  /**
   * The underlying key-value storage implementation.
   * Defaults to localStorage in browser environments.
   */
  backend?: IKVStorage;

  /**
   * Key naming configuration.
   */
  keys?: StorageKeyConfig;

  /**
   * Logout cleanup configuration.
   * If not provided, resetAndLogout() will only clear sync keys.
   */
  logout?: LogoutCleanupConfig;
}
