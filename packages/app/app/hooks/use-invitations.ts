import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Invitation, CreateInvitationInput } from "@avileo/shared";
import { api } from "~/lib/api-client";

async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await api.invitations.get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch invitations");
  }

  return data.data as unknown as Invitation[];
}

async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  const { data, error } = await api.invitations.post(input);

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to create invitation");
  }

  return data.data as unknown as Invitation;
}

async function cancelInvitation(id: string): Promise<void> {
  const { data, error } = await api.invitations({ id }).cancel.post();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success) {
    throw new Error("Failed to cancel invitation");
  }
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: getInvitations,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
