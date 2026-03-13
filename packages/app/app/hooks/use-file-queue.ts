import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  processAllPendingUploads,
  type FileUploadResult,
} from "~/lib/file-queue";
import { useUpdatePayment } from "./use-payments";

export function useProcessPendingUploads() {
  const queryClient = useQueryClient();
  const updatePayment = useUpdatePayment();

  return useMutation({
    mutationFn: async () => {
      const results = await processAllPendingUploads();
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function usePendingUploadsCount() {
  return useMutation({
    mutationFn: async () => {
      const { getPendingUploads } = await import("~/lib/file-queue");
      const uploads = await getPendingUploads();
      return uploads.length;
    },
  });
}
