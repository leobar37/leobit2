import { useQuery } from "@tanstack/react-query";
import type { Business } from "@avileo/shared";
import { offlineCache } from "~/lib/cache";

const CACHE_KEY = "business";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedBusinessData {
  businessUserId: string;
  fromCache: true;
}

export function useCachedBusiness(pg: unknown | null) {
  return useQuery({
    queryKey: ["cached-business"],
    queryFn: async () => {
      if (!pg) return undefined;

      const cached = await offlineCache.get<Business | CachedBusinessData>(pg, CACHE_KEY);
      if (!cached) return undefined;

      const businessUserId =
        typeof (cached as { businessUserId?: unknown }).businessUserId === "string"
          ? (cached as { businessUserId: string }).businessUserId
          : undefined;

      if (!businessUserId) return undefined;

      return {
        businessUserId,
        fromCache: true,
      } satisfies CachedBusinessData;
    },
    enabled: !!pg,
    staleTime: Infinity,
    retry: false,
  });
}

export async function setCachedBusiness(pg: unknown, data: CachedBusinessData): Promise<void> {
  await offlineCache.set(pg, CACHE_KEY, data, CACHE_TTL_MS);
}

export async function clearCachedBusiness(pg: unknown): Promise<void> {
  await offlineCache.remove(pg, CACHE_KEY);
}
