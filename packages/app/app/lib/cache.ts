/**
 * Generic persistent cache using PGlite
 * Simple key-value storage with optional TTL
 */

import type { PGlite } from "@electric-sql/pglite";

const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  cached_at BIGINT NOT NULL,
  expires_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_app_cache_expires ON app_cache(expires_at);
`;

async function ensureTable(pg: PGlite): Promise<void> {
  try {
    await pg.exec(CACHE_TABLE_SQL);
  } catch (error) {
    console.warn("[Cache] Failed to create table:", error);
  }
}

function getPg(): PGlite | null {
  // Lazy import to avoid circular dependencies
  const { getDatabase } = require("~/engine") as typeof import("~/engine");
  const result = getDatabase();
  return result?.pg ?? null;
}

export const offlineCache = {
  async get<T>(key: string): Promise<T | null> {
    const pg = getPg();
    if (!pg) return null;

    try {
      await ensureTable(pg);

      const result = await pg.query<{ value: string; expires_at: string | null }>(
        `SELECT value, expires_at FROM app_cache WHERE key = $1`,
        [key]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const expiresAt = row.expires_at ? parseInt(row.expires_at, 10) : null;

      if (expiresAt && Date.now() > expiresAt) {
        await this.remove(key);
        return null;
      }

      return JSON.parse(row.value) as T;
    } catch (error) {
      console.error(`[Cache] Failed to get "${key}":`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const pg = getPg();
    if (!pg) {
      console.warn("[Cache] PGlite not available, skipping cache");
      return;
    }

    try {
      await ensureTable(pg);

      const now = Date.now();
      const expiresAt = ttlMs ? now + ttlMs : null;
      const jsonValue = JSON.stringify(value);

      await pg.query(
        `INSERT INTO app_cache (key, value, cached_at, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           cached_at = EXCLUDED.cached_at,
           expires_at = EXCLUDED.expires_at`,
        [key, jsonValue, now, expiresAt]
      );
    } catch (error) {
      console.error(`[Cache] Failed to set "${key}":`, error);
    }
  },

  async remove(key: string): Promise<void> {
    const pg = getPg();
    if (!pg) return;

    try {
      await pg.query(`DELETE FROM app_cache WHERE key = $1`, [key]);
    } catch (error) {
      console.error(`[Cache] Failed to remove "${key}":`, error);
    }
  },

  async clear(): Promise<void> {
    const pg = getPg();
    if (!pg) return;

    try {
      await pg.exec(`DELETE FROM app_cache`);
    } catch (error) {
      console.error("[Cache] Failed to clear cache:", error);
    }
  },
};
