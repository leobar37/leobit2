/**
 * Business Cache - Offline-first business data caching
 * Stores business data in PGlite with 24h TTL for offline access
 */

import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { PGlite } from "@electric-sql/pglite";

const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS business_cache (
  id TEXT PRIMARY KEY DEFAULT 'cached_business',
  data JSONB NOT NULL,
  cached_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
`;

const CACHE_KEY = "cached_business";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const cachedBusinessSchema = z.object({
  id: z.string(),
  businessUserId: z.string(),
  name: z.string(),
  ruc: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  logoUrl: z.string().nullable(),
  modoOperacion: z.string().nullable(),
  usarDistribucion: z.boolean(),
  permitirVentaSinStock: z.boolean(),
  role: z.string(),
  salesPoint: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CachedBusinessData = z.infer<typeof cachedBusinessSchema>;

async function ensureTableExists(pg: PGlite): Promise<void> {
  try {
    await pg.exec(CACHE_TABLE_SQL);
  } catch (error) {
    console.warn("[BusinessCache] Failed to create table:", error);
  }
}

export async function cacheBusiness(pg: PGlite, data: CachedBusinessData): Promise<void> {
  if (!pg) {
    console.warn("[BusinessCache] PGlite not available, skipping cache");
    return;
  }

  try {
    await ensureTableExists(pg);

    const now = Date.now();
    const expiresAt = now + CACHE_TTL_MS;
    const dataJson = JSON.stringify(data).replace(/'/g, "''");

    await pg.exec(`
      INSERT INTO business_cache (id, data, cached_at, expires_at)
      VALUES ('${CACHE_KEY}', '${dataJson}', ${now}, ${expiresAt})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        cached_at = EXCLUDED.cached_at,
        expires_at = EXCLUDED.expires_at
    `);

    console.log(`[BusinessCache] Cached business data, expires at ${new Date(expiresAt).toISOString()}`);
  } catch (error) {
    console.error("[BusinessCache] Failed to cache business:", error);
  }
}

export async function getCachedBusiness(pg: PGlite | null): Promise<CachedBusinessData | null> {
  if (!pg) {
    return null;
  }

  try {
    await ensureTableExists(pg);

    const result = await pg.query<{ data: string; cached_at: string; expires_at: string }>(
      `SELECT data, cached_at, expires_at FROM business_cache WHERE id = $1`,
      [CACHE_KEY]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const cachedAt = parseInt(row.cached_at, 10);
    const expiresAt = parseInt(row.expires_at, 10);
    const now = Date.now();

    if (now > expiresAt) {
      console.log("[BusinessCache] Cache expired, clearing");
      await clearCachedBusiness(pg);
      return null;
    }

    const parsed = JSON.parse(row.data);
    const validation = cachedBusinessSchema.safeParse(parsed);

    if (!validation.success) {
      console.warn("[BusinessCache] Cache validation failed, clearing:", validation.error);
      await clearCachedBusiness(pg);
      return null;
    }

    const ageHours = ((now - cachedAt) / (1000 * 60 * 60)).toFixed(1);
    console.log(`[BusinessCache] Cache hit, age: ${ageHours}h`);
    return validation.data;
  } catch (error) {
    console.error("[BusinessCache] Failed to get cached business:", error);
    return null;
  }
}

export async function clearCachedBusiness(pg: PGlite): Promise<void> {
  if (!pg) return;

  try {
    await pg.exec(`DELETE FROM business_cache WHERE id = '${CACHE_KEY}'`);
    console.log("[BusinessCache] Cache cleared");
  } catch (error) {
    console.error("[BusinessCache] Failed to clear cache:", error);
  }
}

export function isCacheExpired(cachedAt: number): boolean {
  return Date.now() > cachedAt + CACHE_TTL_MS;
}

export function getCacheAge(cachedAt: number): { hours: number; minutes: number; isStale: boolean } {
  const now = Date.now();
  const age = now - cachedAt;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  return {
    hours,
    minutes,
    isStale: age > CACHE_TTL_MS,
  };
}

/**
 * Hook to synchronously get cached business data
 * Uses staleTime: Infinity so the cache check is synchronous
 */
export function useCachedBusiness(pg: PGlite | null) {
  return useQuery({
    queryKey: ["cached-business", pg],
    queryFn: () => getCachedBusiness(pg),
    staleTime: Infinity,
    enabled: !!pg,
    gcTime: CACHE_TTL_MS,
  });
}
