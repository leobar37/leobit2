import { FetchError, snakeCamelMapper } from "@electric-sql/client";
import {
  getStoredAuthToken,
  getStoredBusinessId,
} from "~/lib/session-storage";
import { createElectricFetchClient } from "../electric-sync-events";

function getAuthorizationHeader() {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Missing auth token for Electric sync");
  }

  return `Bearer ${token}`;
}

function getBusinessHeader() {
  const businessId = getStoredBusinessId();

  if (!businessId) {
    throw new Error("Missing business context for Electric sync");
  }

  return businessId;
}

export function createShapeOptions(table: string) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";

  return {
    url: `${apiUrl}/electric`,
    params: {
      table,
    },
    headers: {
      Authorization: () => getAuthorizationHeader(),
      "x-business-id": () => getBusinessHeader(),
    },
    fetchClient: createElectricFetchClient(table),
    columnMapper: snakeCamelMapper(),
    onError: (error: unknown) => {
      console.error(`Electric sync error for ${table}:`, error);

      if (error instanceof FetchError) {
        // Only retry on server errors (5xx) and rate limiting (429)
        // Don't retry on client errors (4xx) as they are permanent failures
        if (error.status >= 500 || error.status === 429) {
          return {}; // Retry with exponential backoff
        }
        
        // For 4xx errors (401, 403, 404, etc.), don't retry - they're permanent failures
        console.warn(`[Electric] Permanent error ${error.status} for ${table}, stopping retries`);
        return; // Stop retrying
      }

      // For non-FetchError errors, don't retry
      return;
    },
  };
}
