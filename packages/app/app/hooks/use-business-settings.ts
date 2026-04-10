import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { BusinessCalculatorSettings } from "@avileo/shared";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const CALCULATOR_SETTINGS_KEY = PERSISTED_REMOTE_QUERY_KEYS.businessCalculatorSettings;

async function fetchCalculatorSettings(): Promise<BusinessCalculatorSettings> {
  const { data, error } = await api.businesses.me["calculator-settings"].get();
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch settings");
  return data.data;
}

async function updateCalculatorSettings(
  settings: BusinessCalculatorSettings
): Promise<BusinessCalculatorSettings> {
  const { data, error } = await api.businesses.me["calculator-settings"].put(settings);
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to update settings");
  return data.data;
}

export function useBusinessSettings() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: CALCULATOR_SETTINGS_KEY,
    queryFn: fetchCalculatorSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const mutation = useMutation({
    mutationFn: updateCalculatorSettings,
    onSuccess: (newSettings) => {
      queryClient.setQueryData(CALCULATOR_SETTINGS_KEY, newSettings);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
