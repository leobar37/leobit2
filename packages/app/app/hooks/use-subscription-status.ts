import { useQuery } from "@tanstack/react-query";
import type { PlanStatus } from "@avileo/shared";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.subscriptionStatus,
    queryFn: async () => {
      const response = await api.subscriptions.status.get();
      return extractData<PlanStatus>(response, "Failed to load subscription status");
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
