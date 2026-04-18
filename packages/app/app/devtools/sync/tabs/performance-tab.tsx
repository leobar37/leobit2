import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, HardDrive, Database, MemoryStick, Activity } from "lucide-react";
import { usePerformanceMetrics, formatBytes } from "../hooks/use-performance-metrics";

export function PerformanceTab() {
  const { metrics, isLoading, refresh } = usePerformanceMetrics();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Rendimiento</h3>
          <p className="text-xs text-muted-foreground">
            Actualizado: {metrics.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Memoria JS</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              {metrics.memoryUsage !== null ? `${metrics.memoryUsage} MB` : "N/A"}
            </p>
            {metrics.memoryUsage && (
              <p className="text-xs text-muted-foreground">
                {formatBytes(metrics.memoryUsage)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Storage</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              {metrics.storageUsage !== null ? `${metrics.storageUsage} MB` : "N/A"}
            </p>
            {metrics.storageQuota && metrics.storageUsage && (
              <div className="mt-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (metrics.storageUsage / metrics.storageQuota) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de {formatBytes(metrics.storageQuota)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Registros</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalRecords}</p>
            <p className="text-xs text-muted-foreground">operaciones sync</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Tablas</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.tableCount}</p>
            <p className="text-xs text-muted-foreground">en base local</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <h4 className="text-sm font-medium mb-2">Notas de rendimiento</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• La memoria JS muestra el heap usado por el navegador</li>
          <li>• El storage incluye IndexedDB y cache del navegador</li>
          <li>• Los datos se actualizan cada 5 segundos</li>
          {metrics.memoryUsage && metrics.memoryUsage > 500 && (
            <li className="text-orange-600">
              • Uso de memoria elevado - considera recargar la página
            </li>
          )}
          {metrics.storageUsage && metrics.storageQuota && metrics.storageUsage / metrics.storageQuota > 0.8 && (
            <li className="text-red-600">
              • Storage casi lleno - considera limpiar datos locales
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
