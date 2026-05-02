export type MediaKind = "file" | "asset";

export interface ResolvedMedia {
  id: string;
  kind: MediaKind;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface MediaResolveRequest {
  files?: string[];
  assets?: string[];
}

export interface MediaResolveResponse {
  files: Record<string, ResolvedMedia>;
  assets: Record<string, ResolvedMedia>;
}

export interface UploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
