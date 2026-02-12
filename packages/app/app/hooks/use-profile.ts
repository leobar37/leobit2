import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface Profile {
  id: string;
  email: string;
  name: string;
  dni: string | null;
  phone: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  dni?: string;
  phone?: string;
  birthDate?: string;
}

async function getProfile(): Promise<Profile> {
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

async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const { data, error } = await api.profile.avatar.post({ file });

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to upload avatar");
  }

  return data.data as { avatarUrl: string };
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

  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
