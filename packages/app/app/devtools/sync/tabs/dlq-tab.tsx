import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { useListSearch } from "~/hooks/use-list-search";
import type { DeadLetterOperation } from "../types";
import { DeadLetterRow } from "../components/dead-letter-row";

interface DLQTabProps {
  deadLetterOperations: DeadLetterOperation[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  canAct: boolean;
}

export function DLQTab({ deadLetterOperations, onRetry, onDelete, onClearAll, canAct }: DLQTabProps) {
  const { filteredItems: filteredDeadLetterOperations, search, setSearch } = useListSearch({
    items: deadLetterOperations,
    searchFields: [
      (operation) => operation.entity_type,
      (operation) => operation.entity_id,
      (operation) => operation.operation,
      (operation) => operation.error,
      (operation) => operation.original_error ?? undefined,
    ],
    debounceMs: 150,
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Dead letter queue</h3>
          <p className="text-xs text-muted-foreground">
            Operaciones apartadas tras agotar reintentos
          </p>
        </div>
        {deadLetterOperations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
            onClick={onClearAll}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Vaciar DLQ
          </Button>
        )}
      </div>

      <Alert className="mb-3 border-orange-200 bg-orange-50/80 text-orange-900">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Úsalo solo para depuración. Reintentar devuelve la operación a la cola pendiente.
        </AlertDescription>
      </Alert>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar en DLQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
        />
      </div>

      <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
        {filteredDeadLetterOperations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>
              {search
                ? "No se encontraron operaciones en DLQ"
                : "No hay operaciones en dead letter"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDeadLetterOperations.map((op) => (
              <DeadLetterRow
                key={op.id}
                operation={op}
                onRetry={onRetry}
                onDelete={onDelete}
                canAct={canAct}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}