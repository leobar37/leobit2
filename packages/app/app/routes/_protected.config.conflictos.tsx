import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Check, X, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "~/hooks/use-business";
import { getStoredBusinessId, getStoredAuthToken } from "~/lib/session-storage";
import type { BackendConflict } from "~/lib/sync/types";

interface ConflictListItemProps {
  conflict: BackendConflict;
  onResolve: (conflictId: string, resolution: "server" | "local" | "merge") => Promise<void>;
}

function ConflictListItem({ conflict, onResolve }: ConflictListItemProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (resolution: "server" | "local" | "merge") => {
    setIsResolving(true);
    try {
      await onResolve(conflict.id, resolution);
    } finally {
      setIsResolving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const entityLabel = conflict.entityType.replace(/_/g, " ");

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium capitalize">
                {entityLabel}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                ID: {conflict.entityId.slice(0, 8)}...
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Pendiente
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Detectado el {formatDate(conflict.createdAt)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-3 bg-orange-50/50">
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Versión Local
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versión:</span>
                <span>{conflict.localVersion}</span>
              </div>
              <div className="max-h-24 overflow-auto">
                {Object.entries(conflict.localData).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="truncate max-w-[120px]">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-blue-50/50">
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Versión Servidor
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versión:</span>
                <span>{conflict.serverVersion}</span>
              </div>
              <div className="max-h-24 overflow-auto">
                {Object.entries(conflict.serverData).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="truncate max-w-[120px]">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleResolve("server")}
            disabled={isResolving}
          >
            {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Usar servidor
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleResolve("local")}
            disabled={isResolving}
          >
            {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Usar local
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
            onClick={() => handleResolve("merge")}
            disabled={isResolving}
          >
            {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Fusionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConflictosPage() {
  const [conflicts, setConflicts] = useState<BackendConflict[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    const businessId = getStoredBusinessId();
    const token = getStoredAuthToken();

    if (!businessId || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";
      const response = await fetch(`${apiUrl}/sync/conflicts?status=pending&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-business-id": businessId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conflicts: ${response.status}`);
      }

      const data = await response.json();
      setConflicts(data.data.conflicts);
      setPendingCount(data.data.pendingCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conflicts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResolve = async (conflictId: string, resolution: "server" | "local" | "merge") => {
    const businessId = getStoredBusinessId();
    const token = getStoredAuthToken();

    if (!businessId || !token) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";
      const response = await fetch(`${apiUrl}/sync/conflicts/${conflictId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-business-id": businessId,
        },
        body: JSON.stringify({ resolution }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve conflict: ${response.status}`);
      }

      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error resolving conflict:", err);
      alert(err instanceof Error ? err.message : "Failed to resolve conflict");
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conflictos de Sincronización</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revisa y resuelve conflictos entre datos locales y del servidor
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-800">
              {pendingCount} conflicto{pendingCount > 1 ? "s" : ""} pendiente{pendingCount > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-orange-700">
              Los datos no se sincronizarán hasta que se resuelvan
            </p>
          </div>
        </div>
      )}

      {isLoading && conflicts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-medium text-green-800">Sin conflictos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No hay conflictos pendientes de resolver
          </p>
        </div>
      ) : (
        <div>
          {conflicts.map((conflict) => (
            <ConflictListItem key={conflict.id} conflict={conflict} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  );
}
