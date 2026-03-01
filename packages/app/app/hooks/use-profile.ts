import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useUploadFile } from "./use-files";

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
  const { data, error } = await api.profile.me.get();

  if (error) {
    const err = error.value as { message?: string; code?: string } | undefined;
    throw new Error(err?.message || err?.code || "Request failed");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch profile");
  }

  return data.data as Profile;
}

PR
async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await api.profile.me.put(input);

  if (error) {
    const err = error.value as { message?: string; code?: string } | undefined;
    throw new Error(err?.message || err?.code || "Request failed");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to update profile");
  }

  return data.data as Profile;
}
  const { data, error } = await api.profile.me.get();

  if (error) {
    const err = error.value as { message?: string; code?: string } | undefined;
    throw new Error(err?.message || err?.code || "Request failed");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch profile");
  }

  return data.data as Profile;
}
WV
PR
async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await api.profile.me.put(input);

  if (error) {
    const err = error.value as { message?: string; code?: string } | undefined;
    throw new Error(err?.message || err?.code || "Request failed");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to update profile");
  }

  return data.data as Profile;
}
  const { data, error } = await api.profile.me.get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch profile");
  }

  return data.data as Profile;
}

async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await api.profile.me.put(input);

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to update profile");
  }

  return data.data as Profile;
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

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const uploadFile = useUploadFile();

  return useMutation({
    mutationFn: async (file: File) => {
      const result = await uploadFile.mutateAsync(file);
      await updateProfile({ avatarId: result.id });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
