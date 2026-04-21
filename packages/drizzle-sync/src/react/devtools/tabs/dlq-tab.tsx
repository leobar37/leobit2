import { useState } from "react";
import { Search, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Input, ScrollArea, Alert } from "../ui/primitives";
import type { DeadLetterOperation } from "../types";
import { DeadLetterRow } from "../components/sync-components";

interface DLQTabProps {
  deadLetterOperations: DeadLetterOperation[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  canAct: boolean;
}

export function DLQTab({ deadLetterOperations, onRetry, onDelete, onClearAll, canAct }: DLQTabProps) {
  const [search, setSearch] = useState("");

  const filteredDeadLetterOperations = search.trim()
    ? deadLetterOperations.filter((op) =>
        op.entity_type.toLowerCase().includes(search.toLowerCase()) ||
        op.entity_id.toLowerCase().includes(search.toLowerCase()) ||
        op.operation.toLowerCase().includes(search.toLowerCase()) ||
        op.error.toLowerCase().includes(search.toLowerCase()) ||
        (op.original_error && op.original_error.toLowerCase().includes(search.toLowerCase()))
      )
    : deadLetterOperations;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Dead letter queue</h3>
          <p className="text-xs text-gray-500">Operaciones apartadas tras agotar reintentos</p>
        </div>
        {deadLetterOperations.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm px-2 py-1 rounded-lg transition-colors"
          >
            <Trash2 className="h-3 w-3 inline mr-1" />Vaciar DLQ
          </button>
        )}
      </div>

      <Alert className="mb-3 border-orange-200 bg-orange-50/80 text-orange-900">
        <AlertTriangle className="h-4 w-4 inline mr-1" />
        Úsalo solo para depuración. Reintentar devuelve la operación a la cola pendiente.
      </Alert>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar en DLQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-4"
        />
      </div>

      <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
        {filteredDeadLetterOperations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>{search ? "No se encontraron operaciones en DLQ" : "No hay operaciones en dead letter"}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDeadLetterOperations.map((op) => (
              <DeadLetterRow key={op.id} operation={op} onRetry={onRetry} onDelete={onDelete} canAct={canAct} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
