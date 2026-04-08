/**
 * Sync Conflict Types
 *
 * Types for representing and resolving sync conflicts with the server.
 */

export interface BackendConflict {
  id: string;
  businessId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  status: "pending" | "resolved";
  resolution: "server" | "local" | "merge" | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface BackendConflictListResponse {
  success: boolean;
  data: {
    conflicts: BackendConflict[];
    pendingCount: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface BackendConflictResponse {
  success: boolean;
  data: BackendConflict;
}

export interface ConflictResolution {
  resolution: "server" | "local" | "merge";
  mergedData?: Record<string, unknown>;
}

export type SyncApiResult = {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
};
