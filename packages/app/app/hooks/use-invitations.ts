import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Invitation, CreateInvitationInput } from "@avileo/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function getInvitations(): Promise<Invitation[]> {
  const response = await fetch(`${API_URL}/invitations`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch invitations");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch invitations");
  }

  return result.data;
}

async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  const response = await fetch(`${API_URL}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create invitation");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to create invitation");
  }

  return result.data;
}

async function cancelInvitation(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/invitations/${id}/cancel`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel invitation");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to cancel invitation");
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
