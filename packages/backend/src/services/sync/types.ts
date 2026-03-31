import type { SyncEntity } from "@avileo/shared";

export type { SyncEntity } from "@avileo/shared";

export type SyncOperationType = "create" | "update" | "delete";

export interface SyncOperationInput {
  idempotencyKey: string;
  entityType: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  syncGroupId?: string;
  correlationId?: string;
}

export interface SyncOperationResult {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

export interface SyncBatchResult {
  results: SyncOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}
