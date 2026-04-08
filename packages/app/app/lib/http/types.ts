/**
 * HTTP Base Types
 *
 * Core types for the HTTP client.
 * Focused on what the sync client needs.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpHeaders {
  [key: string]: string;
}

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers?: HttpHeaders;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: HttpHeaders;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RequestContext {
  url: string;
  method: HttpMethod;
  headers: HttpHeaders;
  body?: unknown;
  signal?: AbortSignal;
}

export interface ResponseContext<T = unknown> {
  response: HttpResponse<T>;
  request: RequestContext;
}

export interface ErrorContext {
  error: Error;
  request: RequestContext;
  response?: HttpResponse<unknown>;
}

export interface HttpInterceptor {
  id: string;
  onRequest?: (context: RequestContext) => Promise<RequestContext> | RequestContext;
  onResponse?: <T>(context: ResponseContext<T>) => Promise<ResponseContext<T>> | ResponseContext<T>;
  onError?: (context: ErrorContext) => Promise<ErrorContext> | ErrorContext;
}

export interface IHttpClient {
  get<T>(url: string, config?: { headers?: HttpHeaders; signal?: AbortSignal }): Promise<HttpResponse<T>>;
  post<T>(url: string, body?: unknown, config?: { headers?: HttpHeaders; signal?: AbortSignal }): Promise<HttpResponse<T>>;
  put<T>(url: string, body?: unknown, config?: { headers?: HttpHeaders; signal?: AbortSignal }): Promise<HttpResponse<T>>;
  patch<T>(url: string, body?: unknown, config?: { headers?: HttpHeaders; signal?: AbortSignal }): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: { headers?: HttpHeaders; signal?: AbortSignal }): Promise<HttpResponse<T>>;
  request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
  addInterceptor(interceptor: HttpInterceptor): () => void;
  removeInterceptor(id: string): void;
  abortAll(): void;
}
