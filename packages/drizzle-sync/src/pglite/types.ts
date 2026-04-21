/**
 * PGlite Types
 * Re-exports types for backward compatibility
 */

export type {
  PullResult,
  PullStatus,
  PullHttpClient,
  CursorStorage,
} from "./pull-types";

// PullChange is defined in the original types - let's define it here for compatibility
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
