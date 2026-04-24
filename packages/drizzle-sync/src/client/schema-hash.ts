/**
 * Schema Hash Utilities
 *
 * Provides SHA-256 hashing for schema SQL to detect changes
 * and trigger database resets when the schema evolves.
 */

import type { StorageAdapter } from "./storage/storage";
import type { StorageKeyConfig } from "./storage/types";
import { resolveStorageKey } from "./storage/storage";

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
 *
 * Accepts either a StorageAdapter or legacy options for backward compatibility.
 */
export async function hasSchemaChanged(
  sql: string,
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): Promise<{ changed: boolean; currentHash: string; storedHash: string }>;

export async function hasSchemaChanged(
  sql: string,
  adapter: StorageAdapter
): Promise<{ changed: boolean; currentHash: string; storedHash: string }>;

export async function hasSchemaChanged(
  sql: string,
  optionsOrAdapter?: { versionKey?: string; storage?: Storage } | StorageAdapter
): Promise<{ changed: boolean; currentHash: string; storedHash: string }> {
  const currentHash = await computeSchemaHash(sql);

  let storedHash: string;
  if (optionsOrAdapter && "getByKind" in optionsOrAdapter) {
    // StorageAdapter path
    storedHash = optionsOrAdapter.getByKind("schemaHash") ?? "";
  } else {
    // Legacy path
    const versionKey = (optionsOrAdapter as { versionKey?: string })?.versionKey ?? "drizzle_sync_schema_hash";
    const storage = (optionsOrAdapter as { storage?: Storage })?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
    storedHash = storage?.getItem(versionKey) ?? "";
  }

  return {
    changed: storedHash !== currentHash,
    currentHash,
    storedHash,
  };
}

/**
 * Save schema hash to storage.
 *
 * Accepts either a StorageAdapter or legacy options for backward compatibility.
 */
export function saveSchemaHash(
  hash: string,
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): void;

export function saveSchemaHash(
  hash: string,
  adapter: StorageAdapter
): void;

export function saveSchemaHash(
  hash: string,
  optionsOrAdapter?: { versionKey?: string; storage?: Storage } | StorageAdapter
): void {
  if (optionsOrAdapter && "setByKind" in optionsOrAdapter) {
    // StorageAdapter path
    optionsOrAdapter.setByKind("schemaHash", hash);
  } else {
    // Legacy path
    const versionKey = (optionsOrAdapter as { versionKey?: string })?.versionKey ?? "drizzle_sync_schema_hash";
    const storage = (optionsOrAdapter as { storage?: Storage })?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
    storage?.setItem(versionKey, hash);
  }
}

/**
 * Clear stored schema hash to force reset on next init.
 *
 * Accepts either a StorageAdapter or legacy options for backward compatibility.
 */
export function clearSchemaHash(
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): void;

export function clearSchemaHash(
  adapter: StorageAdapter
): void;

export function clearSchemaHash(
  optionsOrAdapter?: { versionKey?: string; storage?: Storage } | StorageAdapter
): void {
  if (optionsOrAdapter && "removeByKind" in optionsOrAdapter) {
    // StorageAdapter path
    optionsOrAdapter.removeByKind("schemaHash");
  } else {
    // Legacy path
    const versionKey = (optionsOrAdapter as { versionKey?: string })?.versionKey ?? "drizzle_sync_schema_hash";
    const storage = (optionsOrAdapter as { storage?: Storage })?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
    storage?.removeItem(versionKey);
  }
}
