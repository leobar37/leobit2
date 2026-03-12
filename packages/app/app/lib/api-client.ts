import { treaty } from "@elysiajs/eden";
import type { App } from "@avileo/backend";
import { getStoredAuthToken, getStoredBusinessId } from "./session-storage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: "omit",
  },
  headers: (path) => {
    const token = getStoredAuthToken();
    const businessId = getStoredBusinessId();
    console.log("[API]", path, "- token:", token ? "YES" : "NO");
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

/** Extracts data from Eden response or throws standardized error */
export function extractData<T>(
  response: { data?: { success: boolean; data?: T; error?: string } | null; error?: { value: unknown } | null },
  defaultError = "Request failed"
): T {
  if (response.error) {
    throw new Error(String(response.error.value));
  }
  if (!response.data?.success || !response.data.data) {
    throw new Error(response.data?.error || defaultError);
  }
  return response.data.data;
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
