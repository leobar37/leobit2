/**
 * Schema Hash Utilities
 *
 * Provides SHA-256 hashing for schema SQL to detect changes
 * and trigger database resets when the schema evolves.
 */

import type { StorageAdapter } from "../client/storage/storage";

/**
 * Compute SHA-256 hash of a string
 */
export async function computeSchemaHash(sql: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sql);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if schema has changed by comparing current hash with stored hash.
 */
export async function hasSchemaChanged(
  sql: string,
  adapter: StorageAdapter
): Promise<{ changed: boolean; currentHash: string; storedHash: string }> {
  const currentHash = await computeSchemaHash(sql);
  const storedHash = adapter.getByKind("schemaHash") ?? "";

  return {
    changed: storedHash !== currentHash,
    currentHash,
    storedHash,
  };
}

/**
 * Save schema hash to storage.
 */
export function saveSchemaHash(
  hash: string,
  adapter: StorageAdapter
): void {
  adapter.setByKind("schemaHash", hash);
}

/**
 * Clear stored schema hash to force reset on next init.
 */
export function clearSchemaHash(
  adapter: StorageAdapter
): void {
  adapter.removeByKind("schemaHash");
}
