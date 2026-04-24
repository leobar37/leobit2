import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, uploadFile } from "~/lib/api-client";
import { getFileUploadService } from "@avileo/drizzle-sync/client";

export interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    return "Solo imágenes JPG, PNG, WEBP permitidas";
  }

  if (file.size > MAX_FILE_SIZE) {
    return `Archivo muy grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }

  return null;
}

export const fileKeys = {
  all: ["files"] as const,
  details: () => [...fileKeys.all, "detail"] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

export function useFile(id: string) {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.files({ id }).get();

      if (error) {
        throw new Error(String(error.value));
      }

      return data as unknown as FileRecord;
    },
    enabled: !!id,
  });
}

export interface UploadFileOptions {
  entityType: string;
  entityId?: string;
  fieldName: string;
}

export function useUploadFile(options?: UploadFileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      return uploadFileNow(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export async function uploadFileNow(file: File): Promise<FileUploadResponse> {
  const fileService = getFileUploadService();
  const fileId = crypto.randomUUID();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/files/upload", {
    method: "POST",
    body: formData,
    headers: {
      "X-File-ID": fileId,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.files({ id }).delete();

      if (error) {
        throw new Error(String(error.value));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
