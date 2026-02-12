import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const response = await fetch(`${API_URL}/profile/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  const result = await response.json();
  return result.data;
}

async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const response = await fetch(`${API_URL}/profile/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  const result = await response.json();
  return result.data;
}

async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/profile/avatar`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload avatar");
  }

  const result = await response.json();
  return result.data;
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
