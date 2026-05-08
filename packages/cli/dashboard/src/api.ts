import type { LogResponse, ConfigResponse } from "./types";

const API_BASE = "";

export async function fetchLogs(params: {
  service?: string;
  level?: string;
  grep?: string;
  lines?: number;
}): Promise<LogResponse> {
  const search = new URLSearchParams();
  if (params.service) search.set("service", params.service);
  if (params.level) search.set("level", params.level);
  if (params.grep) search.set("grep", params.grep);
  search.set("lines", String(params.lines ?? 100));

  const res = await fetch(`${API_BASE}/api/logs?${search.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
