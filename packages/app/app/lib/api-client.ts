import { treaty } from "@elysiajs/eden";
import type { App } from "@avileo/backend";
import { getStoredAuthToken, getStoredBusinessId } from "./session-storage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: "omit",
  },
  headers: () => {
    const token = getStoredAuthToken();
    const businessId = getStoredBusinessId();
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (businessId) {
      headers["x-business-id"] = businessId;
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  },
});

function readMessageFromObject(value: Record<string, unknown>): string | null {
  const directMessage = value.message;
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage;
  }

  const nestedError = value.error;
  if (typeof nestedError === "string" && nestedError.trim()) {
    return nestedError;
  }
  if (nestedError && typeof nestedError === "object") {
    return readMessageFromObject(nestedError as Record<string, unknown>);
  }

  const nestedValue = value.value;
  if (typeof nestedValue === "string" && nestedValue.trim()) {
    return nestedValue;
  }
  if (nestedValue && typeof nestedValue === "object") {
    return readMessageFromObject(nestedValue as Record<string, unknown>);
  }

  return null;
}

export function getApiErrorMessage(value: unknown, defaultError = "Request failed"): string {
  if (value instanceof Error) {
    return value.message || defaultError;
  }
  if (typeof value === "string") {
    return value || defaultError;
  }
  if (value && typeof value === "object") {
    return readMessageFromObject(value as Record<string, unknown>) ?? defaultError;
  }
  return defaultError;
}

/** Extracts data from Eden response or throws standardized error */
export function extractData<T>(
  response: { data?: { success: boolean; data?: unknown; error?: unknown } | null; error?: { value: unknown } | null },
  defaultError = "Request failed"
): T {
  if (response.error) {
    throw new Error(getApiErrorMessage(response.error.value, defaultError));
  }
  if (!response.data?.success || response.data.data === undefined || response.data.data === null) {
    throw new Error(getApiErrorMessage(response.data?.error, defaultError));
  }
  return response.data.data as T;
}

/**
 * Upload a file to the API with proper authentication and business context.
 * This function automatically includes the Authorization and x-business-id headers.
 *
 * @param endpoint - API endpoint path (e.g., "/files/upload")
 * @param formData - FormData containing the file and any additional fields
 * @returns Parsed JSON response
 * @throws Error if upload fails
 */
export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getStoredAuthToken();
  const businessId = getStoredBusinessId();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    headers["x-business-id"] = businessId;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(errorData.error || "Upload failed");
  }

  return response.json() as Promise<T>;
}
