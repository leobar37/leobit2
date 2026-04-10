/**
 * Sync HTTP Client Interface
 * 
 * Defines the contract for HTTP communication with the sync backend.
 * This abstraction allows for different implementations (fetch, axios, mock)
 * and enables easier testing.
 */

import type { SyncOperationRecord, BatchSyncResponse } from "../types";

/**
 * Options for querying conflicts
 */
export interface ConflictQueryOptions {
  status?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Interface for sync HTTP client operations
 */
export interface ISyncHttpClient {
  /**
   * Send a batch of operations to the server
   */
  sendBatch(operations: SyncOperationRecord[], signal?: AbortSignal): Promise<BatchSyncResponse>;

  /**
   * Get conflicts from the server
   */
  getConflicts(options?: ConflictQueryOptions): Promise<{
    success: boolean;
    data: {
      conflicts: unknown[];
      pendingCount: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }>;

  /**
   * Get a single conflict by ID
   */
  getConflict(conflictId: string): Promise<{
    success: boolean;
    data: unknown;
  }>;

  /**
   * Resolve a conflict on the server
   */
  resolveConflict(
    conflictId: string,
    resolution: string,
    mergedData?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data: unknown;
  }>;

  /**
   * Abort any in-flight request
   */
  abort(): void;
}
