import * as React from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import type { StagedPullState } from "@avileo/drizzle-sync/pglite";

type StagedPullStateStr = StagedPullState<string>;

interface StagedSyncIndicatorProps {
  critical: StagedPullStateStr;
  recent: StagedPullStateStr;
  historical: StagedPullStateStr;
  isUsable: boolean;
  totalChanges: number;
  className?: string;
}

export function StagedSyncIndicator({
  critical,
  recent,
  historical,
  isUsable,
  totalChanges,
  className,
}: StagedSyncIndicatorProps) {
  // Don't show if all stages are complete
  if (critical.status === "complete" && recent.status === "complete" && historical.status === "complete") {
    return null;
  }

  // Don't show if nothing is loading yet
  if (critical.status === "pending" && recent.status === "pending" && historical.status === "pending") {
    return null;
  }

  const stages = [
    { id: "CRITICAL", label: "Datos esenciales", state: critical, color: "bg-green-500" },
    { id: "RECENT_SALES", label: "Ventas recientes", state: recent, color: "bg-orange-500" },
    { id: "HISTORICAL", label: "Histórico", state: historical, color: "bg-blue-500" },
  ];

  const completedStages = stages.filter(s => s.state.status === "complete").length;
  const totalStages = stages.length;
  const progress = (completedStages / totalStages) * 100;

  return (
    <Card className={cn("border shadow-lg", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">
              {isUsable ? "Sincronizando histórico..." : "Cargando datos..."}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isUsable 
                ? "La app está lista. Cargando datos históricos en segundo plano."
                : "Por favor espere mientras cargamos los datos esenciales."
              }
            </p>
          </div>
          {isUsable && (
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          )}
        </div>

        <Progress value={progress} className="h-2 mb-3" />

        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-2 text-sm">
              <StatusIcon status={stage.state.status} color={stage.color} />
              <span className={cn(
                "flex-1",
                stage.state.status === "complete" && "text-muted-foreground"
              )}>
                {stage.label}
              </span>
              {stage.state.changesApplied > 0 && (
                <span className="text-xs text-muted-foreground">
                  {stage.state.changesApplied} registros
                </span>
              )}
            </div>
          ))}
        </div>

        {totalChanges > 0 && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
            Total: {totalChanges} registros sincronizados
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ 
  status, 
  color 
}: { 
  status: StagedPullStateStr["status"]; 
  color: string;
}) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className={cn("w-4 h-4", color.replace("bg-", "text-"))} />;
    case "loading":
      return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "pending":
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
}
