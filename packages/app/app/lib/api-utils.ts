/**
 * API utility helpers for online-first frontend.
 *
 * These helpers standardize Eden Treaty response unwrapping
 * and provide typed error handling for all API calls.
 */

import { extractData, getApiErrorMessage } from "~/lib/api-client";

// Re-export extractData with the naming convention used in hooks
export { extractData, extractData as unwrapApiResponse };

/**
 * Standard API error shape returned by the backend error plugin.
 */
export interface ApiError {
  value: unknown;
}

/**
 * Standard API success response shape.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type guard to check if a value is an API error object.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value
  );
}

/**
 * Type guard to check if an API response contains valid data.
 */
export function isApiSuccess<T>(
  response: { data?: ApiResponse<T> | null; error?: ApiError | null }
): response is { data: { success: true; data: T } } {
  return !!response.data?.success && !!response.data.data && !response.error;
}

/**
 * Safely extract an error message from any unknown error value.
 * Useful in catch blocks and mutation onError handlers.
 */
export function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Ocurrió un error inesperado");
}
