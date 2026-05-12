import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import {
  prefetchLikelyRoutes,
  prefetchRoute as prefetchSingleRoute,
} from "~/lib/query/smart-prefetch";

export function useSmartPrefetch() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: business } = useBusiness();
  const lastPrefetchKeyRef = useRef<string | null>(null);

  const context = useMemo(
    () => ({
      business,
    }),
    [business]
  );

  useEffect(() => {
    const prefetchKey = `${location.pathname}:${business?.id ?? ""}`;
    if (!business || lastPrefetchKeyRef.current === prefetchKey) return;

    lastPrefetchKeyRef.current = prefetchKey;
    void prefetchLikelyRoutes(queryClient, location.pathname, context);
  }, [business, context, location.pathname, queryClient]);

  const prefetchRoute = useCallback(
    (href: string) => {
      void prefetchSingleRoute(queryClient, href, context);
    },
    [context, queryClient]
  );

  return { prefetchRoute };
}
