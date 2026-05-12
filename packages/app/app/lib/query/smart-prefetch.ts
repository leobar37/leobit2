import type { QueryClient, QueryKey } from "@tanstack/react-query";
import {
  getCachedMiDistribucionId,
  getLikelyPrefetchRoutes,
  getRoutePrefetchQueries,
  type RoutePrefetchContext,
  type RoutePrefetchQuery,
} from "~/lib/query/route-prefetch-registry";

const DEFAULT_PREFETCH_STALE_TIME = 5 * 60 * 1000;
const MAX_ROUTE_PREFETCH_CONCURRENCY = 2;
const inFlightRoutePrefetches = new Map<string, Promise<void>>();

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function getQueryStaleTime(query: RoutePrefetchQuery): number {
  return typeof query.staleTime === "number" ? query.staleTime : DEFAULT_PREFETCH_STALE_TIME;
}

function isQueryFresh(
  queryClient: QueryClient,
  queryKey: QueryKey,
  staleTime: number
): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state?.dataUpdatedAt) return false;
  return Date.now() - state.dataUpdatedAt < staleTime;
}

async function prefetchQueries(
  queryClient: QueryClient,
  queries: RoutePrefetchQuery[]
): Promise<void> {
  if (!isOnline()) return;

  const results = await Promise.allSettled(
    queries.map((query) => {
      if (isQueryFresh(queryClient, query.queryKey, getQueryStaleTime(query))) {
        return Promise.resolve();
      }
      return queryClient.prefetchQuery(
        query as Parameters<QueryClient["prefetchQuery"]>[0]
      );
    })
  );

  if (import.meta.env.DEV) {
    for (const result of results) {
      if (result.status === "rejected") {
        console.debug("[SmartPrefetch] Query prefetch failed", result.reason);
      }
    }
  }
}

export async function prefetchRoute(
  queryClient: QueryClient,
  route: string,
  context: RoutePrefetchContext
): Promise<void> {
  if (!context.business) return;

  const prefetchKey = `${context.business.id}:${route}:${context.distribucionId ?? ""}`;
  const inFlight = inFlightRoutePrefetches.get(prefetchKey);
  if (inFlight) {
    await inFlight;
    return;
  }

  const prefetch = (async () => {
    await prefetchQueries(queryClient, getRoutePrefetchQueries(route, context));

    if (route === "/visitas" && !context.distribucionId) {
      const distribucionId = getCachedMiDistribucionId(queryClient, context);
      if (distribucionId) {
        await prefetchQueries(
          queryClient,
          getRoutePrefetchQueries(route, { ...context, distribucionId })
        );
      }
    }
  })();

  inFlightRoutePrefetches.set(prefetchKey, prefetch);
  try {
    await prefetch;
  } finally {
    inFlightRoutePrefetches.delete(prefetchKey);
  }
}

export async function prefetchLikelyRoutes(
  queryClient: QueryClient,
  pathname: string,
  context: RoutePrefetchContext
): Promise<void> {
  if (!context.business) return;

  const routes = getLikelyPrefetchRoutes(pathname, context);
  for (let index = 0; index < routes.length; index += MAX_ROUTE_PREFETCH_CONCURRENCY) {
    const batch = routes.slice(index, index + MAX_ROUTE_PREFETCH_CONCURRENCY);
    await Promise.allSettled(
      batch.map((route) => prefetchRoute(queryClient, route, context))
    );
  }
}
