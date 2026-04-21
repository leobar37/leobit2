import type { EntitySyncSummary, SyncOperation, DeadLetterOperation } from "../types";
import { getEntityTone } from "../types";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`h-6 w-6 rounded-full ${color} flex items-center justify-center`}>
          <Icon className="h-3 w-3 text-white" />
        </div>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

interface EntityRowProps {
  summary: EntitySyncSummary;
}

export function EntityRow({ summary }: EntityRowProps) {
  return (
    <div className={`rounded-xl border p-3 ${getEntityTone(summary)}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{summary.label}</p>
          <p className="text-xs text-gray-500 truncate">{summary.table}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {summary.pending > 0 && (
            <span className="text-xs font-medium text-orange-600">{summary.pending} pend.</span>
          )}
          {summary.error > 0 && (
            <span className="text-xs font-medium text-red-600">{summary.error} err.</span>
          )}
          <span className="text-sm font-bold">{summary.total}</span>
        </div>
      </div>
    </div>
  );
}

import { Trash2 } from "lucide-react";

interface OperationRowProps {
  operation: SyncOperation;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export function OperationRow({ operation, onDelete, canDelete }: OperationRowProps) {
  const statusColors: Record<string, string> = {
    pending: "text-yellow-600",
    processing: "text-blue-600",
    failed: "text-red-600",
    conflict: "text-orange-600",
    completed: "text-green-600",
  };

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${statusColors[operation.status] || "text-gray-500"}`}>
              {operation.status}
            </span>
            <span className="text-xs text-gray-400">{operation.entity_type}</span>
          </div>
          <p className="text-sm truncate">{operation.operation} {operation.entity_id.substring(0, 8)}...</p>
          {operation.last_error && (
            <p className="text-xs text-red-500 truncate">{operation.last_error}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {operation.sync_attempts > 0 && (
            <span className="text-xs text-gray-500">{operation.sync_attempts} retries</span>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(operation.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { RefreshCw } from "lucide-react";

interface DeadLetterRowProps {
  operation: DeadLetterOperation;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  canAct: boolean;
}

export function DeadLetterRow({ operation, onRetry, onDelete, canAct }: DeadLetterRowProps) {
  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-600">DLQ</span>
            <span className="text-xs text-gray-400">{operation.entity_type}</span>
          </div>
          <p className="text-sm truncate">{operation.operation} {operation.entity_id.substring(0, 8)}...</p>
          <p className="text-xs text-red-500 truncate">{operation.error}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canAct && (
            <>
              <button
                onClick={() => onRetry(operation.id)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Retry"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(operation.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: "⏳",
    processing: "🔄",
    failed: "❌",
    conflict: "⚠️",
    completed: "✅",
  };
  return icons[status] || "❓";
}
