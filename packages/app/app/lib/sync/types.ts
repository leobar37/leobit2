/**
 * Sync Types
 * Shared types for the sync engine
 */

export interface PullChange {
  idempotencyKey: string;
  entityType: string;
  operation: "create" | "update" | "delete";
  entityId: string;
  payload: Record<string, unknown>;
  localTimestamp: string;
  processedAt: string;
}

export interface PullResponse {
  changes: PullChange[];
  nextSince: string;
  hasMore: boolean;
  serverTimestamp?: string;
}

export interface PullResult {
  success: boolean;
  changesApplied: number;
  hasMore: boolean;
  error?: string;
}

export interface PullStatus {
  isPulling: boolean;
  lastPullTime: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  cursor: string | null;
}

export interface ChangeApplicationResult {
  success: boolean;
  error?: string;
}

export type SyncOperation = "create" | "update" | "delete";
