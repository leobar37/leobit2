import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { SyncStatus } from "../types";
import { StatCard } from "../components/stat-card";
import { useHealthScore, getHealthScoreColor, getHealthScoreBgColor } from "../hooks/use-health-score";

interface StatusTabProps {
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  isStuck: boolean;
  lastSyncTime: Date | null;
  consecutiveFailures: number;
}

export function StatusTab({
  status,
  isOnline,
  isSyncing,
  isStuck,
  lastSyncTime,
  consecutiveFailures,
}: StatusTabProps) {
  const { healthScore } = useHealthScore();

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border p-4 ${
          healthScore.status === "healthy"
            ? "border-green-200 bg-green-50/80"
            : healthScore.status === "warning"
              ? "border-orange-200 bg-orange-50/80"
              : healthScore.status === "critical"
                ? "border-red-200 bg-red-50/80"
                : "border-amber-200 bg-amber-50/80"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {healthScore.status === "healthy" ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : healthScore.status === "warning" ? (
              <Clock className="h-8 w-8 text-orange-500" />
            ) : healthScore.status === "critical" ? (
              <XCircle className="h-8 w-8 text-red-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            )}
            <div>
              <p className="font-semibold">
                {healthScore.status === "healthy"
                  ? "Sincronización al día"
                  : healthScore.status === "warning"
                    ? `${status.pending} cambios pendientes`
                    : healthScore.status === "critical"
                      ? "Operaciones con error"
                      : "Sync atascado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSyncing
                  ? "Sincronizando..."
                  : lastSyncTime
                    ? `Último sync: ${formatTime(lastSyncTime)}`
                    : "Sin sincronización aún"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="default" className="bg-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {isSyncing && (
              <Badge variant="outline">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Syncing
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${getHealthScoreBgColor(healthScore.score)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${getHealthScoreColor(healthScore.score)}`}>
              {healthScore.score}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium capitalize">
                  {healthScore.status === "healthy"
                    ? "Saludable"
                    : healthScore.status === "warning"
                      ? "Advertencia"
                      : healthScore.status === "critical"
                        ? "Crítico"
                        : "Atascado"}
                </span>
                {healthScore.trend && (
                  <TrendIndicator trend={healthScore.trend} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Health Score</p>
            </div>
          </div>
        </div>

        {healthScore.factors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Desglose de deducciones:</p>
            <div className="flex flex-wrap gap-2">
              {healthScore.factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs bg-background/60 px-2 py-1 rounded-lg"
                >
                  <span className="text-muted-foreground">{factor.name}:</span>
                  <span className="font-medium text-red-600">-{factor.deduction}</span>
                  <span className="text-muted-foreground">({factor.value})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={status.pending} icon={Clock} color="bg-yellow-500" />
        <StatCard label="Fallidos" value={status.failed} icon={XCircle} color="bg-red-500" />
        <StatCard label="Conflictos" value={status.conflict} icon={AlertTriangle} color="bg-orange-500" />
        <StatCard label="Completados" value={status.completed} icon={CheckCircle} color="bg-green-500" />
        <StatCard label="Dead Letter" value={status.deadLetter} icon={Database} color="bg-gray-500" />
        <StatCard label="Total" value={status.total} icon={ArrowUpDown} color="bg-blue-500" />
      </div>

      {consecutiveFailures > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {consecutiveFailures} fallos consecutivos de pull
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: "improving" | "stable" | "degrading" }) {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "degrading":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "stable":
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `hace ${diffSec}s`;
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHour < 24) return `hace ${diffHour}h`;

  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}
