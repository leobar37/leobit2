/**
 * HTTP Client Adapter for SyncClientEngine
 *
 * Bridges the app's BaseHttpClient to the ISyncClientHttpClient interface
 * expected by @avileo/drizzle-sync/client SyncClientEngine.
 */

import type {
  ISyncClientHttpClient,
  BackendConflictListResponse,
  BackendConflictResponse,
} from "@avileo/drizzle-sync/client";
import { BaseHttpClient } from "~/lib/http/base-http-client";
import { getStoredAuthToken } from "~/lib/session-storage";

export function createSyncEngineHttpClient(
  businessId: string,
  baseUrl?: string
): ISyncClientHttpClient {
  const url = baseUrl || import.meta.env.VITE_API_URL || "http://localhost:5201";

  const client = new BaseHttpClient({
    baseUrl: url,
    defaultTimeout: 30000,
    maxRetries: 3,
    retryBaseDelay: 1000,
    retryMaxDelay: 30000,
  });

  // Auth interceptor
  client.addInterceptor({
    id: "sync-auth",
    onRequest: (context) => {
      const token = getStoredAuthToken();
      if (token) {
        context.headers["Authorization"] = `Bearer ${token}`;
      }
      context.headers["x-business-id"] = businessId;
      context.headers["Content-Type"] = "application/json";
      return context;
    },
  });

  return {
    async postBatch(operations) {
      const response = await client.post<{
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
      }>("/sync/batch", { operations });

      const body = response.data;

      if (!body.success || !body.data?.results) {
        return { success: false, results: [] };
      }

      return {
        success: true,
        results: body.data.results.map((r) => ({
          success: r.success,
          idempotencyKey: r.idempotencyKey,
          error: r.error,
          conflict: r.conflict
            ? {
                entityType: "",
                entityId: "",
                clientVersion: 0,
                serverVersion: r.conflict.serverVersion,
                serverData: r.conflict.serverData,
              }
            : undefined,
          serverTimestamp: new Date().toISOString(),
        })),
      };
    },

    async getChanges({ businessId: _bizId, since, entityTypes, limit }) {
      const searchParams = new URLSearchParams();
      if (since) searchParams.set("since", since);
      if (entityTypes?.length) searchParams.set("entityTypes", entityTypes.join(","));
      if (limit) searchParams.set("limit", String(limit));

      const queryString = searchParams.toString();
      const path = `/sync/changes${queryString ? `?${queryString}` : ""}`;

      const response = await client.get<{
        success: boolean;
        data?: {
          changes: unknown[];
          nextSince: string;
          hasMore: boolean;
        };
      }>(path);

      const body = response.data;

      return {
        changes: body.data?.changes || [],
        nextSince: body.data?.nextSince || "",
        hasMore: body.data?.hasMore || false,
      };
    },

    async getConflicts(options): Promise<BackendConflictListResponse> {
      const searchParams = new URLSearchParams();
      if (options?.status) searchParams.set("status", options.status);
      if (options?.entityType) searchParams.set("entityType", options.entityType);
      if (options?.limit) searchParams.set("limit", String(options.limit));
      if (options?.offset) searchParams.set("offset", String(options.offset));

      const queryString = searchParams.toString();
      const path = `/sync/conflicts${queryString ? `?${queryString}` : ""}`;

      const response = await client.get<{
        success: boolean;
        data: {
          conflicts: Array<{
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
          }>;
          pendingCount: number;
          pagination: {
            limit: number;
            offset: number;
            hasMore: boolean;
          };
        };
      }>(path);

      return response.data as BackendConflictListResponse;
    },

    async getConflict(conflictId: string): Promise<BackendConflictResponse> {
      const response = await client.get<{
        success: boolean;
        data: {
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
        };
      }>(`/sync/conflicts/${conflictId}`);

      return response.data as BackendConflictResponse;
    },

    async resolveConflict(
      conflictId: string,
      resolution: "server" | "local" | "merge",
      mergedData?: Record<string, unknown>
    ): Promise<BackendConflictResponse> {
      const response = await client.post<{
        success: boolean;
        data: {
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
        };
      }>(`/sync/conflicts/${conflictId}/resolve`, {
        resolution,
        mergedData,
      });

      return response.data as BackendConflictResponse;
    },

    abort() {
      client.abortAll();
    },
  };
}
