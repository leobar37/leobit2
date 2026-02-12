import { useQuery, useMutation } from "@tanstack/react-query";
import type { PublicInvitation } from "@avileo/shared";
import { api } from "~/lib/api-client";

async function validateInvitation(token: string): Promise<PublicInvitation> {
  const { data, error } = await api.public.invitations({ token }).get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Invitación no válida");
  }

  return data.data as PublicInvitation;
}

async function acceptInvitation({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<void> {
  const { data, error } = await api.public.invitations.accept.post({
    token,
    userId,
  });

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success) {
    throw new Error("Error al aceptar invitación");
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
