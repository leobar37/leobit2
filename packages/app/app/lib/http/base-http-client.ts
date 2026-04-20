/**
 * Base HTTP Client
 *
 * Simple, scalable HTTP client with:
 * - Interceptor system
 * - Automatic retry with exponential backoff
 * - Timeout handling
 * - AbortController management
 *
 * Token refresh is handled by Better Auth automatically.
 */

import type { IHttpClient, HttpRequestConfig, HttpResponse, HttpHeaders, RequestContext, HttpInterceptor } from "./types";
import { InterceptorChain } from "./interceptors";
import { HttpError, AuthenticationError, createErrorFromResponse, isAbortError } from "./errors";
import { withRetry, withTimeout, mergeHeaders } from "./utils";

export interface BaseHttpClientConfig {
  baseUrl: string;
  defaultTimeout?: number;
  defaultHeaders?: HttpHeaders;
  maxRetries?: number;
  retryBaseDelay?: number;
  retryMaxDelay?: number;
}

/**
 * Base HTTP Client implementation
 */
export class BaseHttpClient implements IHttpClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: HttpHeaders;
  private maxRetries: number;
  private retryBaseDelay: number;
  private retryMaxDelay: number;

  private interceptors = new InterceptorChain();
  private abortControllers = new Map<string, AbortController>();

  constructor(config: BaseHttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay ?? 1000;
    this.retryMaxDelay = config.retryMaxDelay ?? 30000;
  }

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  async get<T>(
    url: string,
    config?: { headers?: HttpHeaders; signal?: AbortSignal }
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: "GET",
      url,
      headers: config?.headers,
      signal: config?.signal,
    });
  }

  async post<T>(
    url: string,
    body?: unknown,
    config?: { headers?: HttpHeaders; signal?: AbortSignal }
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: "POST",
      url,
      body,
      headers: config?.headers,
      signal: config?.signal,
    });
  }

  async put<T>(
    url: string,
    body?: unknown,
    config?: { headers?: HttpHeaders; signal?: AbortSignal }
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: "PUT",
      url,
      body,
      headers: config?.headers,
      signal: config?.signal,
    });
  }

  async patch<T>(
    url: string,
    body?: unknown,
    config?: { headers?: HttpHeaders; signal?: AbortSignal }
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: "PATCH",
      url,
      body,
      headers: config?.headers,
      signal: config?.signal,
    });
  }

  async delete<T>(
    url: string,
    config?: { headers?: HttpHeaders; signal?: AbortSignal }
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: "DELETE",
      url,
      headers: config?.headers,
      signal: config?.signal,
    });
  }

  // ============================================================================
  // Core Request Execution
  // ============================================================================

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(config.url);
    const requestId = this.generateRequestId();

    // Create abort controller
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    // Link external signal if provided
    if (config.signal) {
      config.signal.addEventListener("abort", () => abortController.abort());
    }

    // Build request context (outside try for access in catch)
    let context: RequestContext = {
      url: fullUrl,
      method: config.method,
      headers: mergeHeaders(this.defaultHeaders, config.headers),
      body: config.body,
      signal: abortController.signal,
    };

    try {
      // Execute request interceptors
      context = await this.interceptors.executeRequest(context);

      // Execute with retry logic
      const response = await withRetry(
        () => this.executeFetch<T>(context, config.timeout),
        {
          maxRetries: this.maxRetries,
          baseDelay: this.retryBaseDelay,
          maxDelay: this.retryMaxDelay,
          shouldRetry: (error, attempt) => this.shouldRetry(error, attempt),
        },
        () => abortController.signal.aborted
      );

      // Execute response interceptors
      const responseContext = await this.interceptors.executeResponse({
        response,
        request: context,
      });

      return responseContext.response;
    } catch (error) {
      // Execute error interceptors
      const errorContext = await this.interceptors.executeError({
        error: error instanceof Error ? error : new Error(String(error)),
        request: context,
      });

      throw errorContext.error;
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  // ============================================================================
  // Fetch Execution
  // ============================================================================

  private async executeFetch<T>(
    context: RequestContext,
    timeout?: number
  ): Promise<HttpResponse<T>> {
    const timeoutMs = timeout ?? this.defaultTimeout;

    const fetchPromise = fetch(context.url, {
      method: context.method,
      headers: context.headers,
      body: context.body ? JSON.stringify(context.body) : undefined,
      signal: context.signal,
    });

    const response = await withTimeout(fetchPromise, timeoutMs);

    if (!response.ok) {
      const body = await this.parseBody(response);
      throw createErrorFromResponse(response.status, response.statusText, body);
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<HttpResponse<T>> {
    const headers: HttpHeaders = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: T;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
    };
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }
    try {
      return await response.text();
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  private shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry abort errors
    if (isAbortError(error)) return false;

    // Retry auth errors only once (Better Auth will refresh automatically on retry)
    if (error instanceof AuthenticationError) {
      return attempt === 1;
    }

    // Retry on transient errors
    return error.name !== "AbortError";
  }

  // ============================================================================
  // Interceptors
  // ============================================================================

  addInterceptor(interceptor: HttpInterceptor): () => void {
    return this.interceptors.add(interceptor);
  }

  removeInterceptor(id: string): void {
    this.interceptors.remove(id);
  }

  // ============================================================================
  // Abort Control
  // ============================================================================

  abortAll(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// Re-export everything for convenience
export * from "./types";
export * from "./errors";
export * from "./interceptors";
export * from "./utils";
