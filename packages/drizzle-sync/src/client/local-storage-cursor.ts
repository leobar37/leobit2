/**
 * LocalStorage-based cursor storage implementation.
 *
 * Persists pull cursors to localStorage using the same key scheme
 * as the legacy Avileo app for backward compatibility.
 */

import type { IClientCursorStorage } from "./types";

export interface LocalStorageCursorOptions {
  /** Base key prefix (default: "avileo_pull_cursor") */
  prefix?: string;
  /** Namespace suffix for multi-tenancy isolation */
  namespace?: string;
}

/**
 * Create a localStorage cursor storage with Avileo-compatible keys.
 *
 * Key format: `{prefix}:{namespace}` or `{prefix}` if no namespace.
 * Stage cursors: `{prefix}:{namespace}_{stageKey}` or `{prefix}_{stageKey}`.
 */
export function createLocalStorageCursorStorage(
  options?: LocalStorageCursorOptions
): IClientCursorStorage {
  const prefix = options?.prefix ?? "avileo_pull_cursor";
  const namespace = options?.namespace;

  const baseKey = namespace ? `${prefix}:${namespace}` : prefix;

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
