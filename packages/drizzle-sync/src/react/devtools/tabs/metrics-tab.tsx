import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { Button } from "../ui/primitives";
import { useSyncMetrics, MetricCard } from "../hooks/use-sync-metrics";

export function MetricsTab() {
  const { metrics, timeWindow, setTimeWindow, isLoading } = useSyncMetrics();
  const entityEntries = Object.entries(metrics.entityBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Métricas de sincronización</h3>
          <p className="text-xs text-gray-500">
            Última actualización: {metrics.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["1h", "6h", "24h"] as const).map((w) => (
              <Button
                key={w}
                variant={timeWindow === w ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeWindow(w)}
                className="h-7 px-3 text-xs rounded-none"
              >
                {w}
              </Button>
            ))}
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Tasa de éxito"
          value={metrics.successRate}
          unit="%"
          color={metrics.successRate >= 80 ? "text-green-600" : metrics.successRate >= 50 ? "text-yellow-600" : "text-red-600"}
        />
        <MetricCard
          label="Tasa de conflicto"
          value={metrics.conflictRate}
          unit="%"
          color={metrics.conflictRate > 10 ? "text-red-600" : metrics.conflictRate > 5 ? "text-yellow-600" : "text-green-600"}
        />
        <MetricCard
          label="Tasa DLQ"
          value={metrics.dlqRate}
          unit="%"
          color={metrics.dlqRate > 5 ? "text-red-600" : metrics.dlqRate > 2 ? "text-yellow-600" : "text-green-600"}
        />
        <MetricCard label="Operaciones/hora" value={metrics.operationsPerHour} unit="op/h" />
        <MetricCard label="Eventos totales" value={metrics.totalOperations} />
        <MetricCard
          label="Tiempo en cola"
          value={metrics.queueAge}
          unit="min"
          color={metrics.queueAge && metrics.queueAge > 5 ? "text-orange-600" : undefined}
        />
      </div>

      {entityEntries.length > 0 && (
        <div className="rounded-xl border bg-white p-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Actividad por entidad</span>
          </div>
          <div className="space-y-2">
            {entityEntries.slice(0, 8).map(([entity, count]) => {
              const maxCount = entityEntries[0]?.[1] || 1;
              const percentage = Math.round((count / maxCount) * 100);
              return (
                <div key={entity} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 truncate">{entity}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Resumen de estado</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-gray-50">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{metrics.successRate}%</p>
            <p className="text-xs text-gray-500">Éxito</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{metrics.conflictRate}%</p>
            <p className="text-xs text-gray-500">Conflictos</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <Database className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <p className="text-lg font-bold">{metrics.dlqRate}%</p>
            <p className="text-xs text-gray-500">DLQ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
