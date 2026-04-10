import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamMember, UpdateTeamMemberInput } from "@avileo/shared";
import { api } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

async function getTeam(): Promise<TeamMember[]> {
  const { data, error } = await api.businesses.me.members.get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch team members");
  }

  return data.data as unknown as TeamMember[];
}

async function updateTeamMember(
  id: string,
  input: UpdateTeamMemberInput
): Promise<void> {
  const { data, error } = await api.businesses.me.members({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success) {
    throw new Error("Failed to update team member");
  }
}

async function deactivateTeamMember(id: string): Promise<void> {
  const { data, error } = await api.businesses.me.members({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success) {
    throw new Error("Failed to deactivate team member");
  }
}

export function useTeam() {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.team,
    queryFn: getTeam,
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeamMemberInput }) =>
      updateTeamMember(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.team });
    },
  });
}

export function useDeactivateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.team });
    },
  });
}
