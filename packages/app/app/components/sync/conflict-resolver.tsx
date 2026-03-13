import { useState, useCallback } from "react";
import { AlertTriangle, Server, Smartphone, GitMerge } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";

export interface ConflictData {
  id: string;
  entityType: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localModifiedAt: Date;
  serverModifiedAt: Date;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: "local" | "server" | "merge";
  mergedData?: Record<string, unknown>;
}

interface ConflictResolverProps {
  conflict: ConflictData | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: ConflictResolution) => Promise<void>;
}

function DataPreview({
  title,
  data,
  timestamp,
  icon: Icon,
  colorClass,
}: {
  title: string;
  data: Record<string, unknown>;
  timestamp: Date;
  icon: React.ElementType;
  colorClass: string;
}) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (value instanceof Date) return value.toLocaleString("es-PE");
    if (typeof value === "boolean") return value ? "Sí" : "No";
    return String(value);
  };

  const entries = Object.entries(data).filter(([key]) =>
    !["id", "syncStatus", "syncAttempts", "createdAt", "updatedAt"].includes(key)
  );

  return (
    <div className={cn("rounded-xl border p-4", colorClass)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">
            Modificado: {timestamp.toLocaleString("es-PE")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">{key}:</span>
            <span className="font-medium truncate max-w-[150px]">
              {formatValue(value)}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Sin datos visibles</p>
        )}
      </div>
    </div>
  );
}

export function ConflictResolver({
  conflict,
  isOpen,
  onClose,
  onResolve,
}: ConflictResolverProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<
    "local" | "server" | "merge" | null
  >(null);

  const handleResolve = useCallback(
    async (resolution: "local" | "server" | "merge") => {
      if (!conflict) return;

      setIsResolving(true);
      setSelectedResolution(resolution);

      try {
        await onResolve({
          conflictId: conflict.id,
          resolution,
          mergedData:
            resolution === "merge"
              ? { ...conflict.serverData, ...conflict.localData }
              : undefined,
        });
        onClose();
      } finally {
        setIsResolving(false);
        setSelectedResolution(null);
      }
    },
    [conflict, onResolve, onClose]
  );

  if (!conflict) return null;

  const hasDifferences = JSON.stringify(conflict.localData) !== JSON.stringify(conflict.serverData);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Conflicto de sincronización</DialogTitle>
          </div>
          <DialogDescription>
            Se detectaron cambios en <strong>{conflict.entityType}</strong> con ID:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{conflict.id}</code>
            . Selecciona qué versión conservar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <DataPreview
            title="Versión local"
            data={conflict.localData}
            timestamp={conflict.localModifiedAt}
            icon={Smartphone}
            colorClass="bg-orange-50 border-orange-200"
          />

          <DataPreview
            title="Versión del servidor"
            data={conflict.serverData}
            timestamp={conflict.serverModifiedAt}
            icon={Server}
            colorClass="bg-blue-50 border-blue-200"
          />
        </div>

        {!hasDifferences && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Los datos son idénticos. No se requiere acción.
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleResolve("local")}
            disabled={isResolving}
            className="gap-2"
          >
            {isResolving && selectedResolution === "local" ? (
              <>
                <span className="animate-spin">⏳</span>
                Aplicando...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                Usar local
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleResolve("server")}
            disabled={isResolving}
            className="gap-2"
          >
            {isResolving && selectedResolution === "server" ? (
              <>
                <span className="animate-spin">⏳</span>
                Aplicando...
              </>
            ) : (
              <>
                <Server className="h-4 w-4" />
                Usar servidor
              </>
            )}
          </Button>

          <Button
            onClick={() => handleResolve("merge")}
            disabled={isResolving || !hasDifferences}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {isResolving && selectedResolution === "merge" ? (
              <>
                <span className="animate-spin">⏳</span>
                Fusionando...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4" />
                Fusionar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolver;
