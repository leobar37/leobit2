import { useQuery, useMutation } from "@tanstack/react-query";
import type { PublicInvitation } from "@avileo/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function validateInvitation(token: string): Promise<PublicInvitation> {
  const response = await fetch(`${API_URL}/public/invitations/${token}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Invitación no válida");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Invitación no válida");
  }

  return result.data;
}

async function acceptInvitation({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/public/invitations/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error al aceptar invitación");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Error al aceptar invitación");
  }
}

export function useValidateInvitation(token: string) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: () => validateInvitation(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: acceptInvitation,
  });
}
