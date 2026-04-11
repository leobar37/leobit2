/**
 * Sync Types
 * Shared types for the sync engine
 */

export interface PullChange {
  idempotencyKey: string;
  entityType: string;
  operation: "create" | "update" | "delete" | "insert";
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
  isStuck: boolean;
  consecutiveStalePulls: number;
}

export interface ChangeApplicationResult {
  success: boolean;
  error?: string;
}

export type SyncOperation = "create" | "update" | "delete" | "insert";

// Re-export from types/index.ts barrel
export type { ISyncQueue } from "./types/index";
export type { EnqueueParams } from "./types/index";
export type { SyncOperationRecord } from "./types/index";
export type { SyncStatus } from "./types/index";
export type { BatchSyncResponse } from "./types/index";
export type { DeadLetterOperationRecord } from "./types/index";
export type { BackendConflict } from "./types/index";
export type { ConflictResolution } from "./types/index";
export type { SyncApiResult } from "./types/index";
export type { BackendConflictListResponse } from "./types/index";
export type { BackendConflictResponse } from "./types/index";
export type { ClassifiedError } from "./types/index";
export { SyncErrorCode } from "./types/index";
export { classifyError } from "./types/index";
export { normalizeDatesToISO } from "./types/index";
export { buildPlaceholders } from "./types/index";
export { parsePayload } from "./types/index";
export { validateEntityTableName } from "./types/index";
export { SYNC_STATUS_ENTITY_TABLES } from "./types/index";
export { SELF_HEAL_INSERTABLE_ENTITIES } from "./types/index";
export type { QueueOptions } from "./types/index";
