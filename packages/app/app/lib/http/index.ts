/**
 * HTTP Client Module
 *
 * Simple HTTP client infrastructure for Avileo sync.
 */

export { BaseHttpClient, type BaseHttpClientConfig } from "./base-http-client";
export type {
  IHttpClient,
  HttpRequestConfig,
  HttpResponse,
  HttpHeaders,
  HttpMethod,
  RetryConfig,
  RequestContext,
  ResponseContext,
  ErrorContext,
  HttpInterceptor,
} from "./types";

export {
  HttpError,
  NetworkError,
  TimeoutError,
  AbortError,
  AuthenticationError,
  createErrorFromResponse,
  isAbortError,
  isRetryableError,
} from "./errors";

export {
  InterceptorChain,
  createAuthInterceptor,
  createHeaderInterceptor,
  createLoggingInterceptor,
} from "./interceptors";

export {
  sleep,
  calculateBackoffDelay,
  isTransientError,
  withRetry,
  withTimeout,
  mergeHeaders,
  buildUrl,
} from "./utils";
