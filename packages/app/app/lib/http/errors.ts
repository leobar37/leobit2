/**
 * HTTP Error Classes
 *
 * Essential typed error classes for HTTP scenarios.
 * Simple and focused for the sync use case.
 */

import type { HttpHeaders } from "./types";

/**
 * Base HTTP Error
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Network Error (no response received)
 */
export class NetworkError extends Error {
  constructor(message = "Network error") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Abort Error (request was cancelled)
 */
export class AbortError extends Error {
  constructor(message = "Request was aborted") {
    super(message);
    this.name = "AbortError";
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends HttpError {
  constructor(message = "Authentication required", data?: unknown) {
    super(message, 401, "Unauthorized", data);
    this.name = "AuthenticationError";
  }
}

/**
 * Create appropriate error from response
 */
export function createErrorFromResponse(
  status: number,
  statusText: string,
  data?: unknown
): HttpError {
  switch (status) {
    case 401:
      return new AuthenticationError("Authentication required", data);
    default:
      if (status >= 500) {
        return new HttpError("Server error", status, statusText, data);
      }
      return new HttpError(statusText, status, statusText, data);
  }
}

/**
 * Check if error is an abort error
 */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof AbortError ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return false;
}
