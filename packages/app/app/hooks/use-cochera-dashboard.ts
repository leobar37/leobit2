import { useQuery } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import type { CocheraDashboardData } from "@avileo/shared";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const COCHERA_DASHBOARD_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraDashboard;

async function fetchCocheraDashboard(): Promise<CocheraDashboardData> {
  const response = await api.cochera.dashboard.get();
  return extractData(response, "Failed to load dashboard");
}

export function useCocheraDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: COCHERA_DASHBOARD_KEY,
    queryFn: fetchCocheraDashboard,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30, // 30 seconds
  });
}
