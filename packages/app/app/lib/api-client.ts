import { treaty } from "@elysiajs/eden";
import type { App } from "@avileo/backend";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bearer_token");
}

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: "omit",
  },
  headers: (path) => {
    const token = getAuthToken();
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
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
