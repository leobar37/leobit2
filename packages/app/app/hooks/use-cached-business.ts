import { useQuery } from "@tanstack/react-query";
import type { PGlite } from "@electric-sql/pglite";
import { offlineCache } from "~/lib/cache";

const CACHE_KEY = "business:current";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedBusinessData {
  businessUserId: string;
  fromCache: true;
}

export function useCachedBusiness(pg: PGlite | null) {
  return useQuery({
    queryKey: ["cached-business"],
    queryFn: async () => {
      if (!pg) return undefined;

      const cached = await offlineCache.get<CachedBusinessData>(CACHE_KEY);
      return cached ?? undefined;
    },
    enabled: !!pg,
    staleTime: Infinity,
    retry: false,
  });
}

export async function setCachedBusiness(data: CachedBusinessData): Promise<void> {
  await offlineCache.set(CACHE_KEY, data, CACHE_TTL_MS);
}

export async function clearCachedBusiness(): Promise<void> {
  await offlineCache.remove(CACHE_KEY);
}
