export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

export type HealthStatusLevel = "healthy" | "warning" | "critical" | "stuck";

export interface HealthScoreFactor {
  name: string;
  deduction: number;
  value: number;
}

export interface HealthScore {
  score: number;
  status: HealthStatusLevel;
  factors: HealthScoreFactor[];
  previousScore: number | null;
  trend: "improving" | "stable" | "degrading" | null;
}

export interface SyncOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  sync_attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface DeadLetterOperation {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  error: string;
  original_error: string | null;
  sync_attempts: number;
  created_at: string;
}

export interface EntitySyncSummary {
  table: string;
  label: string;
  total: number;
  pending: number;
  synced: number;
  error: number;
}

export const OPERATION_TABS = [
  { value: "status", label: "Estado" },
  { value: "operations", label: "Operaciones" },
  { value: "dead-letter", label: "DLQ" },
  { value: "tables", label: "Tablas" },
  { value: "database", label: "BD" },
  { value: "timeline", label: "Timeline" },
  { value: "metrics", label: "Métricas" },
  { value: "performance", label: "Perf" },
] as const;

export type ActiveTab = (typeof OPERATION_TABS)[number]["value"];

export const getEntityTone = (summary: EntitySyncSummary) => {
  if (summary.error > 0) return "border-red-200 bg-red-50/80";
  if (summary.pending > 0) return "border-orange-200 bg-orange-50/80";
  return "border-green-200 bg-green-50/70";
};

export const initialSyncStatus: SyncStatus = {
  pending: 0,
  processing: 0,
  syncing: 0,
  completed: 0,
  failed: 0,
  conflict: 0,
  deadLetter: 0,
  total: 0,
};
