/**
 * Fetch-based Sync HTTP Client Implementation
 *
 * Refactored to use BaseHttpClient for scalability while maintaining
 * the same ISyncHttpClient interface for backward compatibility.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request/response interceptors
 * - Proper error handling with typed errors
 *
 * Note: Token refresh is handled automatically by Better Auth.
 */

import type { ISyncHttpClient, ConflictQueryOptions } from "./sync-http-client";
import type { SyncOperationRecord, BatchSyncResponse } from "../sync-service";
import { getDeviceId, getDeviceFingerprint } from "../device-fingerprint";
import { BaseHttpClient, createHeaderInterceptor, createLoggingInterceptor } from "../../http/base-http-client";
import { getStoredAuthToken } from "../../session-storage";

/**
 * Generate a correlation ID for tracking
 */
function generateCorrelationId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
 * Built on top of BaseHttpClient for scalability
 */
export class FetchSyncHttpClient implements ISyncHttpClient {
  private client: BaseHttpClient;

  constructor(
    private authToken: string,
    private businessId: string,
    baseUrl?: string
  ) {
    const url = baseUrl || import.meta.env.VITE_API_URL || "http://localhost:5201";

    // Create base client with sync-specific configuration
    this.client = new BaseHttpClient({
      baseUrl: url,
      defaultTimeout: 30000,
      maxRetries: 3,
      retryBaseDelay: 1000,
      retryMaxDelay: 30000,
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });

    // Add sync-specific interceptors
    this.setupInterceptors();
  }

  /**
   * Configure interceptors for sync operations
   */
  private setupInterceptors(): void {
    // Auth and business headers interceptor
    this.client.addInterceptor({
      id: "sync-auth",
      onRequest: (context) => {
        // Always get fresh token from storage (Better Auth handles refresh)
        const currentToken = getStoredAuthToken() || this.authToken;

        context.headers["Authorization"] = `Bearer ${currentToken}`;
        context.headers["x-business-id"] = this.businessId;

        // Add correlation ID if not present
        if (!context.headers["x-correlation-id"]) {
          context.headers["x-correlation-id"] = generateCorrelationId();
        }

        return context;
      },
    });

    // Device fingerprint interceptor - adds device metadata to sync requests
    this.client.addInterceptor({
      id: "sync-device",
      onRequest: (context) => {
        // Only add device info to POST /sync/batch requests
        if (context.method === "POST" && context.url.includes("/sync/batch")) {
          const body = context.body as { operations?: unknown[]; deviceId?: string } | undefined;
          if (body?.operations) {
            context.body = {
              ...body,
              deviceId: getDeviceId(),
              sourceFingerprint: getDeviceFingerprint(),
            };
          }
        }
        return context;
      },
    });

    // Logging interceptor (only in development)
    if (import.meta.env.DEV) {
      this.client.addInterceptor(createLoggingInterceptor({
        logRequests: true,
        logResponses: true,
        logErrors: true,
        filter: (url) => url.includes("/sync/"),
      }));
    }
  }

  async sendBatch(operations: SyncOperationRecord[], signal?: AbortSignal): Promise<BatchSyncResponse> {
    const batchCorrelationId = generateCorrelationId();

    console.log(`[FetchSyncHttpClient] Sending batch:`, {
      correlationId: batchCorrelationId,
      operationsCount: operations.length,
    });

    try {
      // Transform operations for the API
      const transformedOperations = operations.map((op) => ({
        idempotencyKey: op.idempotency_key ?? op.id,
        entityType: op.entity_type,
        entityId: op.entity_id,
        operation: op.operation,
        payload: parsePayload(op.payload),
        localVersion: op.version,
        localTimestamp: new Date(op.updated_at).toISOString(),
        correlationId: generateCorrelationId(),
        deviceId: getDeviceId(),
        sourceFingerprint: getDeviceFingerprint(),
        ...(op.sync_group_id ? { syncGroupId: op.sync_group_id } : {}),
      }));

      // Use base client with retry and timeout handling
      const response = await this.client.post<{
        success: boolean;
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
      }>("/sync/batch", {
        operations: transformedOperations,
      }, { signal });

      const body = response.data;

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
      console.error(`[FetchSyncHttpClient] Batch request failed:`, error);
      throw error;
    }
  }

  /**
   * Abort any in-flight batch request
   */
  abort(): void {
    this.client.abortAll();
  }

  async getConflicts(options?: ConflictQueryOptions): Promise<{
    success: boolean;
    data: {
      conflicts: unknown[];
      pendingCount: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    };
  }> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.entityType) params.entityType = options.entityType;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const path = `/sync/conflicts${queryString ? `?${queryString}` : ""}`;

    const response = await this.client.get<{
      success: boolean;
      data: {
        conflicts: unknown[];
        pendingCount: number;
        pagination: { limit: number; offset: number; hasMore: boolean };
      };
    }>(path);

    return response.data;
  }

  async getConflict(conflictId: string): Promise<{
    success: boolean;
    data: unknown;
  }> {
    const response = await this.client.get<{
      success: boolean;
      data: unknown;
    }>(`/sync/conflicts/${conflictId}`);

    return response.data;
  }

  async resolveConflict(
    conflictId: string,
    resolution: string,
    mergedData?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data: unknown;
  }> {
    const response = await this.client.post<{
      success: boolean;
      data: unknown;
    }>(`/sync/conflicts/${conflictId}/resolve`, {
      resolution,
      ...(mergedData ? { mergedData } : {}),
    });

    return response.data;
  }
}
