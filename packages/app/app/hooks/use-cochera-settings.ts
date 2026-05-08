import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import type { CocheraSettings, CocheraSettingsInput } from "@avileo/shared";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const COCHERA_SETTINGS_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraSettings;

async function fetchCocheraSettings(): Promise<CocheraSettings> {
  const response = await api.cochera.settings.get();
  return extractData(response, "Failed to load cochera settings");
}

async function updateCocheraSettings(
  input: CocheraSettingsInput
): Promise<CocheraSettings> {
  const response = await api.cochera.settings.put(input);
  return extractData(response, "Failed to update cochera settings");
}

export function useCocheraSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: COCHERA_SETTINGS_KEY,
    queryFn: fetchCocheraSettings,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useUpdateCocheraSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCocheraSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_SETTINGS_KEY });
    },
  });
}
