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
