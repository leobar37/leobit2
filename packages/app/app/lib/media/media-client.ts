import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";
import { getApiErrorMessage } from "~/lib/api-client";
import type { UploadResponse, MediaResolveRequest, MediaResolveResponse } from "./media-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

function getHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  const businessId = getStoredBusinessId();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    headers["x-business-id"] = businessId;
  }

  return headers;
}

/**
 * Upload a file to the given endpoint with consistent auth/business headers.
 */
export async function uploadMediaFile(endpoint: "/files/upload" | "/assets/upload", file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    body: formData,
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(getApiErrorMessage(errorData, "No se pudo subir el archivo"));
  }

  return response.json() as Promise<UploadResponse>;
}

/**
 * Batch resolve file and asset IDs to metadata with URLs.
 */
export async function resolveMediaBatch(request: MediaResolveRequest): Promise<MediaResolveResponse> {
  const response = await fetch(`${API_URL}/media/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Resolve failed" }));
    throw new Error(getApiErrorMessage(errorData, "No se pudo resolver el archivo"));
  }

  return response.json() as Promise<MediaResolveResponse>;
}
