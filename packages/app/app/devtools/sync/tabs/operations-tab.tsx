import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, CheckCircle, Copy } from "lucide-react";
import { useListSearch } from "~/hooks/use-list-search";
import type { SyncOperation } from "../types";
import { OperationRow } from "../components/operation-row";

interface OperationsTabProps {
  operations: SyncOperation[];
  onDeleteOperation: (id: string) => void;
  onDeleteAll: () => void;
  canDelete: boolean;
}

export function OperationsTab({ operations, onDeleteOperation, onDeleteAll, canDelete }: OperationsTabProps) {
  const { filteredItems: filteredOperations, search, setSearch } = useListSearch({
    items: operations,
    searchFields: [
      (operation) => operation.entity_type,
      (operation) => operation.entity_id,
      (operation) => operation.operation,
      (operation) => operation.status,
      (operation) => operation.last_error ?? undefined,
    ],
    debounceMs: 150,
  });

  const handleCopyJson = () => {
    const json = JSON.stringify(filteredOperations, null, 2);
    navigator.clipboard.writeText(json);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Operaciones con problema</h3>
          <p className="text-xs text-muted-foreground">
            Pendientes, fallidas o en conflicto
          </p>
        </div>
        {operations.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-7 px-2"
              onClick={handleCopyJson}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
              onClick={onDeleteAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Eliminar todas
            </Button>
          </>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar operación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
        />
      </div>

      <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
        {filteredOperations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>
              {search
                ? "No se encontraron operaciones"
                : "No hay operaciones pendientes"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredOperations.map((op) => (
              <OperationRow
                key={op.id}
                operation={op}
                onDelete={onDeleteOperation}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}