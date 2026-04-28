/**
 * Generic fetch-based HTTP client for sync operations.
 *
 * Implements ISyncClientHttpClient using native fetch with:
 * - Auth headers via configurable getter
 * - Exponential backoff retry
 * - Request timeout via AbortController
 */

import type { ISyncClientHttpClient } from "./types";
import type {
  BackendConflict,
  BackendConflictListResponse,
  BackendConflictResponse,
} from "../core";

/**
 * Configuration for the fetch-based HTTP client.
 */
export interface FetchHttpClientConfig {
  /** Base URL for the API (e.g. 'http://localhost:5201') */
  baseUrl: string;
  /** Function that returns the current auth token (or null) */
  getAuthToken: () => string | null;
  /** Optional custom tenant header */
  tenantHeader?: {
    key: string;
    value: () => string;
  };
  /** Additional static headers */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1_000) */
  baseDelayMs?: number;
  /** Max backoff delay in ms (default: 30_000) */
  maxDelayMs?: number;
  /** Function that returns the device ID for multi-device tracking */
  getDeviceId?: () => string;
  /** Function that returns the device fingerprint for multi-device tracking */
  getFingerprint?: () => string;
}

class FetchHttpClient implements ISyncClientHttpClient {
  private abortController: AbortController | null = null;

  constructor(private config: FetchHttpClientConfig) {}

  async postBatch(
    entries: unknown[],
  ): Promise<{ success: boolean; results: unknown[] }> {
    const withDeviceMetadata = (entry: unknown): unknown => {
      if (!entry || typeof entry !== "object") return entry;
      const raw = entry as Record<string, unknown>;
      const enrichOperation = (operation: unknown): unknown => {
        if (!operation || typeof operation !== "object") return operation;
        return {
          ...(operation as Record<string, unknown>),
          deviceId: this.config.getDeviceId?.() ?? undefined,
          sourceFingerprint: this.config.getFingerprint?.() ?? undefined,
        };
      };

      if (raw.kind === "single") {
        return { ...raw, operation: enrichOperation(raw.operation) };
      }
      if (raw.kind === "batch" && Array.isArray(raw.operations)) {
        return { ...raw, operations: raw.operations.map(enrichOperation) };
      }
      return raw;
    };

    const body = await this.fetch<{ success: boolean; data?: { results?: unknown[] } }>(
      "POST",
      "/sync/batch",
      { entries: entries.map(withDeviceMetadata) },
    );

    if (!body.success || !body.data?.results) {
      return { success: false, results: [] };
    }

    return {
      success: true,
      results: (
        body.data.results as Record<string, unknown>[]
      ).map((r) => ({
        success: r.success,
        idempotencyKey: r.idempotencyKey,
        error: r.error,
        conflict: r.conflict
          ? {
              entityType: "",
              entityId: "",
              clientVersion: 0,
              serverVersion: (r.conflict as Record<string, unknown>)
                .serverVersion,
              serverData: (r.conflict as Record<string, unknown>)
                .serverData,
            }
          : undefined,
        serverTimestamp: new Date().toISOString(),
      })),
    };
  }

  async getChanges(params: {
    tenantId: string;
    since?: string;
    entityTypes?: string[];
    limit?: number;
  }): Promise<{ changes: unknown[]; nextSince: string; hasMore: boolean }> {
    const qs = this.buildQueryString({
      since: params.since,
      entityTypes: params.entityTypes?.join(","),
      limit: params.limit?.toString(),
    });

    const body = await this.fetch<{
      success: boolean;
      data?: { changes: unknown[]; nextSince: string; hasMore: boolean };
    }>("GET", `/sync/changes${qs}`);

    return {
      changes: body.data?.changes || [],
      nextSince: body.data?.nextSince || "",
      hasMore: body.data?.hasMore || false,
    };
  }

  async getConflicts(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendConflictListResponse> {
    const qs = this.buildQueryString({
      status: options?.status,
      entityType: options?.entityType,
      limit: options?.limit?.toString(),
      offset: options?.offset?.toString(),
    });

    return this.fetch<BackendConflictListResponse>(
      "GET",
      `/sync/conflicts${qs}`,
    );
  }

  async getConflict(conflictId: string): Promise<BackendConflictResponse> {
    return this.fetch<BackendConflictResponse>(
      "GET",
      `/sync/conflicts/${conflictId}`,
    );
  }

  async resolveConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>,
  ): Promise<BackendConflictResponse> {
    return this.fetch<BackendConflictResponse>(
      "POST",
      `/sync/conflicts/${conflictId}/resolve`,
      { resolution, mergedData },
    );
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildQueryString(
    params: Record<string, string | undefined>,
  ): string {
    const entries = Object.entries(params).filter(([, v]) => v != null);
    if (!entries.length) return "";
    return (
      "?" +
      entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
    );
  }

  private getHeaders(): Record<string, string> {
    const token = this.config.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...this.config.headers,
    };

    if (this.config.tenantHeader) {
      headers[this.config.tenantHeader.key] =
        this.config.tenantHeader.value();
    }

    return headers;
  }

  private async fetch<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const {
      baseUrl,
      timeoutMs = 30_000,
      maxRetries = 3,
      baseDelayMs = 1_000,
      maxDelayMs = 30_000,
    } = this.config;

    const url = `${baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      const timeoutId = setTimeout(
        () => this.abortController?.abort(),
        timeoutMs,
      );

      try {
        const response = await globalThis.fetch(url, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await this.safeParseBody(response);
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}${errorBody ? ` — ${JSON.stringify(errorBody)}` : ""}`,
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError =
          error instanceof Error ? error : new Error(String(error));

        if (this.isNonRetryable(lastError)) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(
            baseDelayMs * Math.pow(2, attempt),
            maxDelayMs,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private isNonRetryable(error: Error): boolean {
    if (error.name === "AbortError") return true;
    const match = error.message.match(/^HTTP (\d+)/);
    if (match) {
      const status = parseInt(match[1], 10);
      return (
        status >= 400 && status < 500 && status !== 408 && status !== 429
      );
    }
    return false;
  }

  private async safeParseBody(response: Response): Promise<unknown> {
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json"))
        return await response.json();
      return await response.text();
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a fetch-based HTTP client for sync operations.
 *
 * @example
 * ```typescript
 * const httpClient = createFetchHttpClient({
 *   baseUrl: 'http://localhost:5201',
 *   getAuthToken: () => localStorage.getItem('token'),
 *   tenantHeader: { key: 'x-business-id', value: () => businessId },
 *   getDeviceId: () => getDeviceId(),
 *   getFingerprint: () => getDeviceFingerprint(),
 * });
 * ```
 */
export function createFetchHttpClient(
  config: FetchHttpClientConfig,
): ISyncClientHttpClient {
  return new FetchHttpClient(config);
}
