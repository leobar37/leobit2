/**
 * Sync Status Hook
 * Monitor sync status, failed operations, and resolve conflicts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncService } from "~/lib/sync/service-provider";
import type { SyncStatus, SyncOperationRecord } from "~/lib/sync/sync-service";
import type { ConflictStrategy } from "~/lib/sync/config";

const QUERY_KEYS = {
  syncStatus: ["sync", "status"],
  failedOperations: ["sync", "failed"],
} as const;

/**
 * Get current sync status (pending, failed, conflict counts)
 */
export function useSyncStatus() {
  const syncService = useSyncService();

  return useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: async (): Promise<SyncStatus> => {
      return syncService.getStatus();
    },
    refetchInterval: 5000,
  });
}

/**
 * Get failed operations for manual retry
 */
export function useFailedOperations() {
  const syncService = useSyncService();

  return useQuery({
    queryKey: QUERY_KEYS.failedOperations,
    queryFn: async (): Promise<SyncOperationRecord[]> => {
      return syncService.getFailedOperations();
    },
  });
}

/**
 * Retry a failed operation
 */
export function useRetryOperation() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operationId: string): Promise<boolean> => {
      return syncService.retryOperation(operationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
    },
  });
}

/**
 * Resolve a sync conflict
 */
export function useResolveConflict() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operationId,
      resolution,
      mergedData,
    }: {
      operationId: string;
      resolution: ConflictStrategy;
      mergedData?: Record<string, unknown>;
    }): Promise<boolean> => {
      return syncService.resolveConflict(operationId, resolution, mergedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
    },
  });
}

/**
 * Force sync all pending operations
 */
export function useForceSync() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{
      processed: number;
      failed: number;
      conflicts: number;
    }> => {
      return syncService.processPending();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
    },
  });
}

/**
 * Process a sync group atomically
 */
export function useProcessGroup() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      groupId: string
    ): Promise<{ success: boolean; errors: string[] }> => {
      return syncService.processGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
    },
  });
}

/**
 * Check if there are any pending sync operations
 */
export function useHasPendingOperations() {
  const { data: status } = useSyncStatus();
  return status ? status.pending > 0 : false;
}

/**
 * Check if there are any failed sync operations
 */
export function useHasFailedOperations() {
  const { data: status } = useSyncStatus();
  return status ? status.failed > 0 : false;
}

/**
 * Check if there are any conflicted sync operations
 */
export function useHasConflicts() {
  const { data: status } = useSyncStatus();
  return status ? status.conflict > 0 : false;
}
