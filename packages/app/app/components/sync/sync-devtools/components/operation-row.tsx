import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, XCircle, AlertTriangle, CheckCircle, Database, Trash2 } from "lucide-react";
import type { SyncOperation } from "../types";

interface OperationRowProps {
  operation: SyncOperation;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "conflict":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Database className="h-4 w-4 text-gray-500" />;
  }
}

export function OperationRow({ operation, onDelete, canDelete }: OperationRowProps) {
  return (
    <div className="p-3 hover:bg-muted/50 sm:p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(operation.status)}
          <span className="font-medium capitalize">{operation.entity_type}</span>
          <Badge variant="outline" className="text-xs">
            {operation.operation}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(operation.created_at).toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${canDelete ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-muted-foreground cursor-not-allowed"}`}
            onClick={() => onDelete(operation.id)}
            title={canDelete ? "Eliminar operación" : "Servicio no disponible"}
            disabled={!canDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <span className="font-mono">{operation.entity_id}</span>
        {operation.sync_attempts > 0 && (
          <span className="ml-2">Intentos: {operation.sync_attempts}</span>
        )}
      </div>
      {operation.last_error && (
        <div className="mt-1 text-xs leading-5 text-red-500 line-clamp-2">
          {operation.last_error}
        </div>
      )}
    </div>
  );
}