/**
 * Generic persistent cache using PGlite
 * Simple key-value storage with optional TTL
 */

const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  cached_at BIGINT NOT NULL,
  expires_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_app_cache_expires ON app_cache(expires_at);
`;

async function ensureTable(pg: unknown): Promise<void> {
  try {
    await (pg as { exec: (sql: string) => Promise<void> }).exec(CACHE_TABLE_SQL);
  } catch (error) {
    console.warn("[Cache] Failed to create table:", error);
  }
}

export const offlineCache = {
  async get<T>(pg: unknown, key: string): Promise<T | null> {
    try {
      await ensureTable(pg);

      const result = await (pg as {
        query: <R>(sql: string, params: unknown[]) => Promise<{ rows: R[] }>
      }).query<{ value: string; expires_at: string | null }>(
        `SELECT value, expires_at FROM app_cache WHERE key = $1`,
        [key]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const expiresAt = row.expires_at ? parseInt(row.expires_at, 10) : null;

      if (expiresAt && Date.now() > expiresAt) {
        await this.remove(pg, key);
        return null;
      }

      return JSON.parse(row.value) as T;
    } catch (error) {
      console.error(`[Cache] Failed to get "${key}":`, error);
      return null;
    }
  },

  async set<T>(pg: unknown, key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      await ensureTable(pg);

      const now = Date.now();
      const expiresAt = ttlMs ? now + ttlMs : null;
      const jsonValue = JSON.stringify(value);

      await (pg as {
        query: (sql: string, params: unknown[]) => Promise<void>
      }).query(
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

  async remove(pg: unknown, key: string): Promise<void> {
    try {
      await (pg as {
        query: (sql: string, params: unknown[]) => Promise<void>
      }).query(`DELETE FROM app_cache WHERE key = $1`, [key]);
    } catch (error) {
      console.error(`[Cache] Failed to remove "${key}":`, error);
    }
  },

  async clear(pg: unknown): Promise<void> {
    try {
      await (pg as { exec: (sql: string) => Promise<void> }).exec(`DELETE FROM app_cache`);
    } catch (error) {
      console.error("[Cache] Failed to clear cache:", error);
    }
  },
};
