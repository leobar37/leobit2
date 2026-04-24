/**
 * LocalStorage-based cursor storage implementation.
 *
 * @deprecated Use `StorageAdapter` from `@avileo/drizzle-sync/client/storage` instead.
 * The StorageAdapter provides the same cursor functionality plus unified access
 * to all storage keys (schema hash, force reset, etc).
 *
 * @example Migration
 * ```typescript
 * // Before
 * const cursorStorage = createLocalStorageCursorStorage({ prefix: 'myapp', namespace: 'tenant-1' });
 *
 * // After
 * const adapter = createStorageAdapter({ keys: { prefix: 'myapp', namespace: 'tenant-1' } });
 * // Cursor operations:
 * adapter.getCursor()        // equivalent to cursorStorage.get(baseKey)
 * adapter.getCursor('stage') // equivalent to cursorStorage.get('stage')
 * adapter.setCursor(val)     // equivalent to cursorStorage.set(baseKey, val)
 * ```
 */

import type { IClientCursorStorage } from "./types";
import type { StorageKeyConfig } from "./storage/types";
import { resolveStorageKey } from "./storage/storage";

export interface LocalStorageCursorOptions {
  /** Base key prefix (default: "drizzle_sync") */
  prefix?: string;
  /** Namespace suffix for multi-tenancy isolation */
  namespace?: string;
}

/**
 * Create a localStorage cursor storage.
 *
 * Key format: `{prefix}:{namespace}_pull_cursor` or `{prefix}_pull_cursor`.
 * Stage cursors: `{base}_{stageKey}`.
 *
 * @deprecated Use `createStorageAdapter()` instead.
 */
export function createLocalStorageCursorStorage(
  options?: LocalStorageCursorOptions
): IClientCursorStorage {
  const keyConfig: StorageKeyConfig = {
    prefix: options?.prefix,
    namespace: options?.namespace,
  };

  const baseKey = resolveStorageKey("pullCursor", keyConfig);

  return {
    get(key: string): string | null {
      try {
        const fullKey = key === baseKey ? baseKey : `${baseKey}_${key}`;
        return localStorage.getItem(fullKey);
      } catch {
        return null;
      }
    },

    set(key: string, value: string): void {
      try {
        const fullKey = key === baseKey ? baseKey : `${baseKey}_${key}`;
        localStorage.setItem(fullKey, value);
      } catch {
        // Silently ignore localStorage errors (e.g. quota exceeded)
      }
    },

    remove(key: string): void {
      try {
        const fullKey = key === baseKey ? baseKey : `${baseKey}_${key}`;
        localStorage.removeItem(fullKey);
      } catch {
        // Silently ignore
      }
    },
  };
}
