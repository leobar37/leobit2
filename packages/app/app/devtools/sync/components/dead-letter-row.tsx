import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Play, Trash2 } from "lucide-react";
import type { DeadLetterOperation } from "../types";

interface DeadLetterRowProps {
  operation: DeadLetterOperation;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  canAct: boolean;
}

export function DeadLetterRow({ operation, onRetry, onDelete, canAct }: DeadLetterRowProps) {
  return (
    <div key={operation.id} className="p-3 hover:bg-muted/50 sm:p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="font-medium capitalize">{operation.entity_type}</span>
          <Badge variant="outline" className="text-xs">
            {operation.operation}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(operation.created_at).toLocaleTimeString()}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <span className="font-mono">{operation.entity_id}</span>
        <span className="ml-2">Intentos: {operation.sync_attempts}</span>
      </div>
      <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs leading-5 text-red-600">
        {operation.original_error ?? operation.error}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onRetry(operation.id)}
          disabled={!canAct}
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          Reintentar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => void onDelete(operation.id)}
          disabled={!canAct}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}