import { useQuery } from "@tanstack/react-query";
import type { PublicInvitation } from "@avileo/shared";
import { api } from "~/lib/api-client";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";

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
}: {
  token: string;
}): Promise<void> {
  const { data, error } = await api.public.invitations.accept.post({
    token,
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
  return useOfflineAwareMutation({
    mutationFn: acceptInvitation,
    offlineMessage: "Se requiere conexión a internet para aceptar la invitación",
  });
}
