/**
 * Storage Implementation
 *
 * Default implementation using localStorage and key generation utilities.
 */

import type {
  IKVStorage,
  StorageKeyConfig,
  StorageKeyKind,
} from "./types";
import { STORAGE_KEYS } from "./types";

/**
 * Map from logical key kind to the default suffix used in STORAGE_KEYS.
 */
const KEY_SUFFIX_MAP: Record<StorageKeyKind, string> = {
  schemaHash: "schema_hash",
  forceReset: "force_reset",
  pullCursor: "pull_cursor",
};

/**
 * Resolve a full storage key from a kind and config.
 *
 * Priority: overrides > generated key
 *
 * Generated format:
 * - Without namespace: `{prefix}_{suffix}`
 * - With namespace: `{prefix}:{namespace}_{suffix}`
 */
export function resolveStorageKey(
  kind: StorageKeyKind,
  config?: StorageKeyConfig
): string {
  // Check overrides first
  if (config?.overrides?.[kind]) {
    return config.overrides[kind];
  }

  const prefix = config?.prefix ?? "drizzle_sync";
  const suffix = KEY_SUFFIX_MAP[kind];

  if (config?.namespace) {
    return `${prefix}:${config.namespace}_${suffix}`;
  }

  return `${prefix}_${suffix}`;
}

/**
 * Create a localStorage-backed IKVStorage.
 * Falls back to a no-op implementation in non-browser environments.
 */
export function createLocalStorageBackend(): IKVStorage {
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }

  // No-op fallback for SSR/test environments
  return createNoOpStorage();
}

/**
 * Create a no-op storage that silently ignores all operations.
 * Useful for SSR or test environments where persistence is not needed.
 */
export function createNoOpStorage(): IKVStorage {
  return {
    getItem(_key: string): string | null {
      return null;
    },
    setItem(_key: string, _value: string): void {
      // No-op
    },
    removeItem(_key: string): void {
      // No-op
    },
  };
}

/**
 * Create an in-memory storage for testing.
 */
export function createMemoryStorage(): IKVStorage & { clear(): void; getAllEntries(): Record<string, string> } {
  const data = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
    removeItem(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
    getAllEntries(): Record<string, string> {
      return Object.fromEntries(data.entries());
    },
  };
}

/**
 * Wraps an IKVStorage to build keys with the given prefix and namespace.
 * This is the main adapter consumers use to interact with storage.
 */
export class StorageAdapter {
  private readonly backend: IKVStorage;

  /** Config for resolving keys */
  readonly keyConfig: StorageKeyConfig;

  constructor(backend: IKVStorage, keyConfig?: StorageKeyConfig) {
    this.backend = backend;
    this.keyConfig = keyConfig ?? {};
  }

  /** Get the underlying backend */
  getBackend(): IKVStorage {
    return this.backend;
  }

  // ── Generic key-value access ──

  get(key: string): string | null {
    return this.backend.getItem(key);
  }

  set(key: string, value: string): void {
    this.backend.setItem(key, value);
  }

  remove(key: string): void {
    this.backend.removeItem(key);
  }

  // ── Resolved key access (uses keyConfig) ──

  /** Get value by storage key kind */
  getByKind(kind: StorageKeyKind): string | null {
    return this.backend.getItem(resolveStorageKey(kind, this.keyConfig));
  }

  /** Set value by storage key kind */
  setByKind(kind: StorageKeyKind, value: string): void {
    this.backend.setItem(resolveStorageKey(kind, this.keyConfig), value);
  }

  /** Remove value by storage key kind */
  removeByKind(kind: StorageKeyKind): void {
    this.backend.removeItem(resolveStorageKey(kind, this.keyConfig));
  }

  /** Get the resolved key string for a given kind */
  keyFor(kind: StorageKeyKind): string {
    return resolveStorageKey(kind, this.keyConfig);
  }

  // ── Cursor-specific (namespaced sub-keys) ──

  /**
   * Get a cursor value. Uses the pullCursor key as base,
   * with optional sub-key for staged cursors.
   */
  getCursor(subKey?: string): string | null {
    const baseKey = this.keyFor("pullCursor");
    const fullKey = subKey ? `${baseKey}_${subKey}` : baseKey;
    return this.backend.getItem(fullKey);
  }

  /**
   * Set a cursor value.
   */
  setCursor(value: string, subKey?: string): void {
    const baseKey = this.keyFor("pullCursor");
    const fullKey = subKey ? `${baseKey}_${subKey}` : baseKey;
    this.backend.setItem(fullKey, value);
  }

  /**
   * Remove a cursor value.
   */
  removeCursor(subKey?: string): void {
    const baseKey = this.keyFor("pullCursor");
    const fullKey = subKey ? `${baseKey}_${subKey}` : baseKey;
    this.backend.removeItem(fullKey);
  }

  // ── Bulk cleanup ──

  /**
   * Clear multiple keys by name.
   */
  removeKeys(keys: string[]): void {
    for (const key of keys) {
      this.backend.removeItem(key);
    }
  }

  /**
   * Clear all well-known sync keys.
   */
  clearSyncKeys(): void {
    this.removeByKind("schemaHash");
    this.removeByKind("forceReset");
    this.removeByKind("pullCursor");
  }
}

/**
 * Create a StorageAdapter with sensible defaults.
 *
 * @param config - Optional storage configuration
 * @returns A configured StorageAdapter
 */
export function createStorageAdapter(config?: {
  backend?: IKVStorage;
  keys?: StorageKeyConfig;
}): StorageAdapter {
  const backend = config?.backend ?? createLocalStorageBackend();
  return new StorageAdapter(backend, config?.keys);
}
