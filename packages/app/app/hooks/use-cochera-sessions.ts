import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import type { CocheraSession, CreateCocheraSessionInput } from "@avileo/shared";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const COCHERA_SESSIONS_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraSessions;

async function fetchCocheraSessions(search?: string): Promise<CocheraSession[]> {
  const response = await api.cochera.sessions.get({ query: search ? { search } : undefined });
  return extractData(response, "Failed to load sessions");
}

async function createCocheraSession(
  input: CreateCocheraSessionInput
): Promise<CocheraSession> {
  const response = await api.cochera.sessions.post(input);
  return extractData(response, "Failed to register entry");
}

export function useCocheraSessions(search?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...COCHERA_SESSIONS_KEY, search ?? ""],
    queryFn: () => fetchCocheraSessions(search),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateCocheraSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCocheraSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_SESSIONS_KEY });
    },
  });
}
