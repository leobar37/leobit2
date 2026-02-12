import { treaty } from "@elysiajs/eden";
import type { App } from "@avileo/backend";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: "include",
  },
});

/** Extracts data from Eden response or throws standardized error */
export function extractData<T>(
  response: { data?: { success: boolean; data?: T; error?: string }; error?: { value: unknown } },
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
