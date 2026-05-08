import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

export interface Profile {
  id: string;
  email: string;
  name: string;
  dni: string | null;
  phone: string | null;
  birthDate: string | null;
  avatarId: string | null;
}

export interface UpdateProfileInput {
  dni?: string;
  phone?: string;
  birthDate?: string;
  avatarId?: string;
}

async function getProfile(): Promise<Profile> {
  return extractData<Profile>(await api.profile.me.get(), "No se pudo cargar el perfil");
}

async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return extractData<Profile>(await api.profile.me.put(input), "No se pudo actualizar el perfil");
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
