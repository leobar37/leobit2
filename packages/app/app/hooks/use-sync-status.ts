/**
 * Sync Status Hook
 * Monitor sync status, failed operations, and resolve conflicts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncService } from "~/lib/sync/engine-provider";
import type {
  SyncStatus,
  SyncOperationRecord,
  DeadLetterOperationRecord,
} from "~/lib/sync/sync-service";
import type { ConflictStrategy } from "@avileo/drizzle-sync/shared";

const QUERY_KEYS = {
  syncStatus: ["sync", "status"],
  failedOperations: ["sync", "failed"],
  deadLetterOperations: ["sync", "dead-letter"],
} as const;

/**
 * Get current sync status (pending, failed, conflict counts)
 */
export function useSyncStatus() {
  const syncService = useSyncService();

  return useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: async (): Promise<SyncStatus> => {
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.getStatus();
    },
    refetchInterval: 5000,
    enabled: !!syncService,
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
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.getFailedOperations();
    },
    enabled: !!syncService,
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
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.retryOperation(operationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
    },
  });
}

export function useDeadLetterOperations() {
  const syncService = useSyncService();

  return useQuery({
    queryKey: QUERY_KEYS.deadLetterOperations,
    queryFn: async (): Promise<DeadLetterOperationRecord[]> => {
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.getDeadLetterOperations();
    },
    enabled: !!syncService,
  });
}

export function useRetryDeadLetterOperation() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deadLetterId: string): Promise<boolean> => {
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.retryDeadLetterOperation(deadLetterId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deadLetterOperations });
    },
  });
}

export function useClearDeadLetterOperations() {
  const syncService = useSyncService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!syncService) {
        throw new Error("SyncService not available");
      }
      return syncService.clearDeadLetterOperations();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.failedOperations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deadLetterOperations });
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
      if (!syncService) {
        throw new Error("SyncService not available");
      }
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
      if (!syncService) {
        throw new Error("SyncService not available");
      }
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
      if (!syncService) {
        throw new Error("SyncService not available");
      }
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
