/**
 * Schema Hash Utilities
 *
 * Provides SHA-256 hashing for schema SQL to detect changes
 * and trigger database resets when the schema evolves.
 */

const DEFAULT_VERSION_KEY = "drizzle_sync_schema_hash";

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
 * Check if schema has changed by comparing current hash with stored hash
 */
export async function hasSchemaChanged(
  sql: string,
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): Promise<{ changed: boolean; currentHash: string; storedHash: string }> {
  const versionKey = options?.versionKey ?? DEFAULT_VERSION_KEY;
  const storage = options?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);

  const currentHash = await computeSchemaHash(sql);
  const storedHash = storage?.getItem(versionKey) ?? "";

  return {
    changed: storedHash !== currentHash,
    currentHash,
    storedHash,
  };
}

/**
 * Save schema hash to storage
 */
export function saveSchemaHash(
  hash: string,
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): void {
  const versionKey = options?.versionKey ?? DEFAULT_VERSION_KEY;
  const storage = options?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);

  storage?.setItem(versionKey, hash);
}

/**
 * Clear stored schema hash to force reset on next init
 */
export function clearSchemaHash(
  options?: {
    versionKey?: string;
    storage?: Storage;
  }
): void {
  const versionKey = options?.versionKey ?? DEFAULT_VERSION_KEY;
  const storage = options?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);

  storage?.removeItem(versionKey);
}
