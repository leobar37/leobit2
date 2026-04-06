/**
 * Fetch-based Sync HTTP Client Implementation
 * 
 * Implements ISyncHttpClient using the native fetch API.
 * Extracted from SyncService to enable testing and separation of concerns.
 */

import type { ISyncHttpClient, ConflictQueryOptions } from "./sync-http-client";
import type { SyncOperationRecord, BatchSyncResponse } from "../sync-service";

/**
 * Generate a correlation ID for tracking
 */
function generateCorrelationId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse payload from string or object
 */
function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") return payload as Record<string, unknown>;
  return {};
}

/**
 * Fetch-based implementation of ISyncHttpClient
 */
export class FetchSyncHttpClient implements ISyncHttpClient {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(
    private authToken: string,
    private businessId: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || "http://localhost:5201";
  }

  async sendBatch(operations: SyncOperationRecord[], signal?: AbortSignal): Promise<BatchSyncResponse> {
    // Cancel any in-flight request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // If an external signal is provided, relay abort to it
    if (signal) {
      signal.addEventListener("abort", () => this.abortController?.abort());
    }

    const batchCorrelationId = generateCorrelationId();

    console.log(`[FetchSyncHttpClient] Sending batch:`, {
      correlationId: batchCorrelationId,
      operationsCount: operations.length,
    });

    try {
      const response = await fetch(`${this.baseUrl}/sync/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
          "x-business-id": this.businessId,
          "x-correlation-id": batchCorrelationId,
        },
        body: JSON.stringify({
          operations: operations.map((op) => ({
            idempotencyKey: op.idempotency_key ?? op.id,
            entityType: op.entity_type,
            entityId: op.entity_id,
            operation: op.operation,
            payload: parsePayload(op.payload),
            localVersion: op.version,
            localTimestamp: new Date(op.updated_at).toISOString(),
            correlationId: generateCorrelationId(),
            ...(op.sync_group_id ? { syncGroupId: op.sync_group_id } : {}),
          })),
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        console.error(`[FetchSyncHttpClient] Batch request failed:`, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`Sync batch failed: ${response.status} ${response.statusText}`);
      }

      const body = await response.json() as {
        success?: boolean;
        data?: {
          results?: Array<{
            idempotencyKey: string;
            success: boolean;
            error?: string;
            conflict?: {
              serverVersion: number;
              serverData: Record<string, unknown>;
            };
          }>;
        };
      };

      if (!body.success || !body.data?.results) {
        throw new Error("Sync batch returned an invalid response");
      }

      console.log(`[FetchSyncHttpClient] Batch response:`, {
        resultsCount: body.data.results.length,
      });

      return {
        results: body.data.results.map((result) => ({
          idempotencyKey: result.idempotencyKey,
          success: result.success,
          error: result.error,
          conflict: result.conflict
            ? {
                serverData: result.conflict.serverData,
                suggestedMerge: result.conflict.serverData,
              }
            : undefined,
        })),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[FetchSyncHttpClient] Batch send was aborted");
        throw error;
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Abort any in-flight batch request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async getConflicts(options?: ConflictQueryOptions): Promise<{
    success: boolean;
    data: {
      conflicts: unknown[];
      pendingCount: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    };
  }> {
    const params = new URLSearchParams();
    if (options?.status) params.set("status", options.status);
    if (options?.entityType) params.set("entityType", options.entityType);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${this.baseUrl}/sync/conflicts${params.toString() ? `?${params}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
        "x-business-id": this.businessId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conflicts: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getConflict(conflictId: string): Promise<{
    success: boolean;
    data: unknown;
  }> {
    const response = await fetch(`${this.baseUrl}/sync/conflicts/${conflictId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
        "x-business-id": this.businessId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conflict: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async resolveConflict(
    conflictId: string,
    resolution: string,
    mergedData?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data: unknown;
  }> {
    const response = await fetch(`${this.baseUrl}/sync/conflicts/${conflictId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
        "x-business-id": this.businessId,
      },
      body: JSON.stringify({
        resolution,
        ...(mergedData ? { mergedData } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve conflict: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
