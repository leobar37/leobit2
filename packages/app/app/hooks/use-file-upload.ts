import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { createSyncId, isOnline } from "~/lib/sync/utils";

export type UploadStatus = "idle" | "uploading" | "pending" | "synced" | "error";

export interface FileUploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface UseFileUploadOptions {
  /** Endpoint to upload to */
  endpoint?: "/files/upload" | "/assets/upload";
  /** Query key to invalidate on success */
  queryKey?: readonly unknown[];
  /** Called when upload succeeds */
  onSuccess?: (response: FileUploadResponse) => void;
  /** Called when upload fails */
  onError?: (error: Error) => void;
}

const DEFAULT_ENDPOINT = "/files/upload";

/**
 * Hook for uploading files with offline support.
 * 
 * When offline, the file is stored in memory and marked as "pending".
 * The caller is responsible for handling pending uploads when back online.
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { 
    endpoint = DEFAULT_ENDPOINT, 
    queryKey,
    onSuccess,
    onError 
  } = options;

  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);

  // Store pending files in memory when offline
  const [pendingFiles, setPendingFiles] = useState<Map<string, { file: File; tempId: string }>>(
    new Map()
  );

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<FileUploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("bearer_token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Error al subir archivo");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadStatus("synced");
      setUploadedFileId(data.id);
      
      // Invalidate query if provided
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      
      onSuccess?.(data);
    },
    onError: (error) => {
      setUploadStatus("error");
      onError?.(error as Error);
    },
  });

  /**
   * Upload a file, handling offline state automatically
   */
  const upload = useCallback(async (file: File): Promise<{
    id: string;
    status: UploadStatus;
  }> => {
    // Check if online
    if (!isOnline()) {
      // Store file for later sync
      const tempId = createSyncId();
      setPendingFiles((prev) => new Map(prev).set(tempId, { file, tempId }));
      setUploadStatus("pending");
      return { id: tempId, status: "pending" };
    }

    // Online - upload directly
    setUploadStatus("uploading");
    
    try {
      const response = await uploadMutation.mutateAsync(file);
      return { id: response.id, status: "synced" };
    } catch (error) {
      // If upload fails, store as pending for retry
      const tempId = createSyncId();
      setPendingFiles((prev) => new Map(prev).set(tempId, { file, tempId }));
      setUploadStatus("pending");
      return { id: tempId, status: "pending" };
    }
  }, [uploadMutation]);

  /**
   * Retry all pending uploads
   */
  const retryPending = useCallback(async () => {
    if (!isOnline() || pendingFiles.size === 0) return;

    const filesToRetry = Array.from(pendingFiles.values());
    setPendingFiles(new Map());

    for (const { file } of filesToRetry) {
      setUploadStatus("uploading");
      try {
        await uploadMutation.mutateAsync(file);
      } catch {
        // Keep failed uploads in pending
        const tempId = createSyncId();
        setPendingFiles((prev) => new Map(prev).set(tempId, { file, tempId }));
      }
    }
  }, [pendingFiles, uploadMutation]);

  /**
   * Clear pending files (user manually clears)
   */
  const clearPending = useCallback(() => {
    setPendingFiles(new Map());
    setUploadStatus("idle");
  }, []);

  /**
   * Get count of pending uploads
   */
  const pendingCount = pendingFiles.size;

  return {
    upload,
    retryPending,
    clearPending,
    pendingCount,
    isUploading: uploadStatus === "uploading",
    isPending: uploadStatus === "pending",
    isSynced: uploadStatus === "synced",
    isError: uploadStatus === "error",
    uploadedFileId,
    status: uploadStatus,
    isOnline: isOnline(),
  };
}
