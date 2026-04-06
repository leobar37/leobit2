/**
 * Sync System Interfaces
 * 
 * TypeScript interfaces for the sync system, enabling dependency injection
 * and easier mocking in tests.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { SyncStage } from "@avileo/shared";

// Re-export existing types from types.ts
export type {
  PullChange,
  PullResponse,
  PullResult,
  PullStatus,
  ChangeApplicationResult,
  SyncOperation,
} from "./types";

import type {
  PullChange,
  PullResult,
  PullStatus,
  ChangeApplicationResult,
} from "./types";

// Import types from sync-service for interface definition
import type { EnqueueParams, SyncOperationRecord, SyncStatus, DeadLetterOperationRecord, BatchSyncResponse } from "./sync-service";
import type { ConflictStrategy } from "./config";

/**
 * ISyncService interface
 * 
 * Defines the contract for the sync service that manages
 * the sync queue and pushes operations to the backend.
 */
export interface ISyncService {
  /**
   * Initialize the sync service (creates tables, runs migrations)
   */
  initialize(): Promise<void>;

  /**
   * Enqueue an operation for sync
   */
  enqueue(params: EnqueueParams): Promise<string>;

  /**
   * Process all pending operations
   */
  processPending(): Promise<{ processed: number; failed: number; conflicts: number }>;

  /**
   * Get current sync status
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Get failed operations
   */
  getFailedOperations(): Promise<SyncOperationRecord[]>;

  /**
   * Get operations with problems (pending, failed, conflict)
   */
  getProblemOperations(): Promise<SyncOperationRecord[]>;

  /**
   * Get dead letter operations
   */
  getDeadLetterOperations(): Promise<DeadLetterOperationRecord[]>;

  /**
   * Retry a failed operation
   */
  retryOperation(operationId: string): Promise<boolean>;

  /**
   * Retry a dead letter operation
   */
  retryDeadLetterOperation(deadLetterId: string): Promise<boolean>;

  /**
   * Delete a dead letter operation
   */
  deleteDeadLetterOperation(deadLetterId: string): Promise<boolean>;

  /**
   * Clear all dead letter operations
   */
  clearDeadLetterOperations(): Promise<number>;

  /**
   * Delete an operation
   */
  deleteOperation(operationId: string): Promise<boolean>;

  /**
   * Resolve a conflict
   */
  resolveConflict(operationId: string, resolution: ConflictStrategy, mergedData?: Record<string, unknown>): Promise<boolean>;

  /**
   * Get backend conflicts
   */
  getBackendConflicts(options?: { status?: string; entityType?: string; limit?: number; offset?: number }): Promise<{ success: boolean; data: { conflicts: unknown[]; pendingCount: number; pagination: { limit: number; offset: number; hasMore: boolean } } }>;

  /**
   * Start automatic sync
   */
  startAutoSync(): void;

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void;

  /**
   * Log detailed status
   */
  logDetailedStatus(): Promise<void>;

  /**
   * Clean up sync data (for logout/business switch)
   */
  cleanup(): Promise<void>;
}

/**
 * Options for pullWithOptions
 */
export interface PullWithOptionsParams {
  entityTypes?: string[];
  since?: string;
  limit?: number;
  cursorKey?: string;
}

/**
 * IPullService interface
 * 
 * Defines the contract for the pull service that fetches changes
 * from the backend sync API.
 */
export interface IPullService {
  /**
   * Initialize the pull service
   */
  initialize(): Promise<void>;

  /**
   * Perform a basic pull operation
   */
  pull(): Promise<PullResult>;

  /**
   * Pull with specific options for staged loading
   */
  pullWithOptions(options: PullWithOptionsParams): Promise<PullResult & { nextSince: string | null }>;

  /**
   * Pull all changes until no more available
   */
  pullAll(): Promise<{ totalApplied: number; errors: string[] }>;

  /**
   * Force an immediate pull
   */
  forcePullNow(): Promise<PullResult>;

  /**
   * Get current pull status
   */
  getStatus(): PullStatus;

  /**
   * Get the last cursor/since value
   */
  getLastSince(): string | null;

  /**
   * Clear the cursor
   */
  clearCursor(): void;

  /**
   * Set sync group ID for filtering
   */
  setSyncGroupId(syncGroupId: string | null): void;

  /**
   * Get current sync group ID
   */
  getSyncGroupId(): string | null;

  /**
   * Set callback for when changes are applied
   */
  setOnChangesApplied(callback: (entityTypes: string[]) => void): void;

  /**
   * Start periodic pull
   */
  startAutoPull(): void;

  /**
   * Stop periodic pull
   */
  stopAutoPull(): void;

  /**
   * Abort any in-flight pull request
   */
  abort(): void;

  /**
   * Clean up pull data (for logout/business switch)
   */
  cleanup(): Promise<void>;
}

/**
 * IChangeApplier interface
 * 
 * Contract for applying sync changes to the local database.
 */
export interface IChangeApplier {
  applyChange(
    pg: PGlite,
    db: unknown,
    change: PullChange,
    businessId: string,
    retriesLeft?: number
  ): Promise<ChangeApplicationResult>;
}

/**
 * Staged pull state for a single stage
 */
export interface StagedPullState {
  stage: SyncStage;
  status: "pending" | "loading" | "complete" | "error";
  changesApplied: number;
  error?: string;
}

/**
 * Staged pull result containing all stage states
 */
export interface StagedPullResult {
  critical: StagedPullState;
  recent: StagedPullState;
  historical: StagedPullState;
}

/**
 * Callback type for progress updates
 */
export type StagedPullProgressCallback = (state: StagedPullState) => void;

/**
 * IStagedPullCoordinator interface
 * 
 * Contract for the staged pull coordinator that orchestrates
 * multi-stage data loading.
 */
export interface IStagedPullCoordinator {
  /**
   * Set progress callback
   */
  setOnProgress(callback: StagedPullProgressCallback): void;

  /**
   * Load CRITICAL stage data
   */
  loadCriticalData(): Promise<StagedPullState>;

  /**
   * Load RECENT_SALES stage data
   */
  loadRecentSales(): Promise<StagedPullState>;

  /**
   * Load HISTORICAL stage data
   */
  loadHistoricalData(): Promise<StagedPullState>;

  /**
   * Execute full staged load sequence
   */
  executeStagedLoad(): Promise<{
    critical: StagedPullState;
    recent: StagedPullState;
    historical: Promise<StagedPullState>;
  }>;

  /**
   * Get current state of all stages
   */
  getAllState(): StagedPullResult;

  /**
   * Check if app is usable (critical + recent complete)
   */
  isAppUsable(): boolean;

  /**
   * Check if all stages are complete
   */
  isComplete(): boolean;

  /**
   * Get total changes applied
   */
  getTotalChangesApplied(): number;

  /**
   * Reset all stage states
   */
  reset(): void;
}
