import { useState, useId } from "react";
import { useEngine } from "~/engine";
import { useClearSyncStorage } from "@/hooks/use-clear-sync-storage";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Database,
  Trash2,
  Play,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useSyncState, useSyncService, useSyncStatus } from "~/lib/sync/service-provider";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { runManualSync } from "~/lib/sync/manual-sync";
import { useToast } from "~/hooks/use-toast";
import { useDevToolsData } from "./hooks/use-devtools-data";
import { useDatabaseData } from "./hooks/use-database-data";
import { OPERATION_TABS, type ActiveTab } from "./types";
import { StatusTab } from "./tabs/status-tab";
import { TablesTab } from "./tabs/tables-tab";
import { OperationsTab } from "./tabs/operations-tab";
import { DLQTab } from "./tabs/dlq-tab";
import { DatabaseTab } from "./tabs/database-tab";
import { TimelineTab } from "./tabs/timeline-tab";
import { MetricsTab } from "./tabs/metrics-tab";
import { PerformanceTab } from "./tabs/performance-tab";

interface SyncDevToolsDrawerProps {
  triggerClassName?: string;
}

export function SyncDevToolsDrawer({ triggerClassName }: SyncDevToolsDrawerProps = {}) {
  const { isSyncing, isInitialized } = useEngine();
  const { isOnline } = useSyncStatus();
  const syncState = useSyncState();
  const syncService = useSyncService();
  const { confirm, ConfirmDialog: DeleteConfirmDialog } = useConfirmDialog();
  const clearSync = useClearSyncStorage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("status");
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);

  const { status, operations, deadLetterOperations, entitySummaries, refetch } = 
    useDevToolsData(isOpen, isInitialized);

  const { dbInfo } = useDatabaseData(isOpen, isInitialized);

  const sheetId = useId();

  const handleForceSync = async () => {
    if (!isInitialized) return;
    setIsForceSyncing(true);
    try {
      // runManualSync uses navigator.onLine as fallback when actualOnline is not provided
      await runManualSync();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleClearStorage = async () => {
    const confirmed = await confirm({
      title: "¿Limpiar almacenamiento local?",
      description:
        "Esto eliminará todos los datos locales, cerrará la sesión y recargará la página. Esta acción no se puede deshacer.",
      confirmText: "Limpiar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) return;
    await clearSync.mutateAsync({ preserveSession: false });
  };

  const handleCopyReport = async () => {
    setIsCopyingReport(true);
    try {
      const avileoDebug = (window as unknown as Record<string, unknown>).avileoDebug as {
        copyDiagnosticReport?: () => Promise<unknown>;
      } | undefined;

      if (avileoDebug?.copyDiagnosticReport) {
        await avileoDebug.copyDiagnosticReport();
        setReportCopied(true);
        setTimeout(() => setReportCopied(false), 2000);
        toast.success("Reporte copiado", {
          description: "El reporte de diagnóstico se copió al portapapeles",
        });
      } else {
        toast.error("Error", {
          description: "El helper de diagnóstico no está disponible",
        });
      }
    } catch (error) {
      console.error("Error copying report:", error);
      toast.error("Error", {
        description: "No se pudo copiar el reporte",
      });
    } finally {
      setIsCopyingReport(false);
    }
  };

  const handleDeleteOperation = async (operationId: string) => {
    if (!syncService) {
      toast.error("Servicio no disponible", {
        description: "El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Eliminar operación",
      description: "¿Estás seguro de eliminar esta operación de sincronización?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) return;

    const success = await syncService.deleteOperation(operationId);
    if (success) {
      toast.success("Operación eliminada", {
        description: "La operación se quitó de la cola local.",
      });
      await refetch();
    }
  };

  const handleDeleteAllOperations = async () => {
    if (!syncService) {
      toast.error("Servicio no disponible", {
        description: "El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Eliminar todas las operaciones",
      description: `¿Estás seguro de eliminar las ${operations.length} operaciones de sincronización? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar todas",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) return;

    const operationIds = operations.map((op) => op.id);
    const deletedCount = await syncService.deleteOperations(operationIds);

    if (deletedCount > 0) {
      toast.success("Operaciones eliminadas", {
        description: `${deletedCount} operaciones eliminadas correctamente.`,
      });
      await refetch();
    } else {
      toast.error("Error", {
        description: "No se pudieron eliminar las operaciones.",
      });
    }
  };

  const handleRetryDeadLetter = async (deadLetterId: string) => {
    if (!syncService) {
      toast.error("Servicio no disponible", {
        description: "El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.",
      });
      return;
    }

    const success = await syncService.retryDeadLetterOperation(deadLetterId);
    if (success) {
      toast.success("Operación reencolada", {
        description: "La operación volvió a la cola pendiente.",
      });
      await refetch();
      return;
    }

    toast.error("No se pudo reintentar", {
      description: "La operación DLQ no pudo reencolarse.",
    });
  };

  const handleDeleteDeadLetter = async (deadLetterId: string) => {
    if (!syncService) {
      toast.error("Servicio no disponible", {
        description: "El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Eliminar registro DLQ",
      description: "¿Estás seguro de eliminar esta operación de dead letter?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) return;

    const success = await syncService.deleteDeadLetterOperation(deadLetterId);
    if (success) {
      toast.success("Registro eliminado", {
        description: "La operación se quitó del dead letter.",
      });
      await refetch();
      return;
    }

    toast.error("No se pudo eliminar", {
      description: "La operación dead letter no pudo eliminarse.",
    });
  };

  const handleClearDeadLetter = async () => {
    if (!syncService) {
      toast.error("Servicio no disponible", {
        description: "El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Vaciar dead letter",
      description:
        "Se eliminarán todas las operaciones apartadas en dead letter para este negocio.",
      confirmText: "Vaciar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) return;

    const deletedCount = await syncService.clearDeadLetterOperations();
    toast.success("Dead letter vaciado", {
      description:
        deletedCount > 0
          ? `Se eliminaron ${deletedCount} operaciones.`
          : "No había operaciones en dead letter.",
    });
    await refetch();
  };

  const triggerTone = !isInitialized
    ? "text-muted-foreground"
    : !isOnline
      ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
      : status.failed > 0 || status.conflict > 0
        ? "bg-red-50 text-red-600 hover:bg-red-100"
        : isSyncing
          ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
          : status.pending > 0
            ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
            : "bg-green-50 text-green-600 hover:bg-green-100";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        className={cn(
          "inline-flex items-center justify-center relative rounded-2xl transition-colors h-9 w-9",
          triggerClassName,
          triggerTone,
          !isInitialized && "opacity-50 cursor-not-allowed"
        )}
        title={
          status.pending > 0
            ? `Hay ${status.pending} cambios pendientes`
            : isOnline
              ? "Sincronización al día"
              : "Sin conexión"
        }
        disabled={!isInitialized}
      >
        <Database className={cn("h-5 w-5", isSyncing && "animate-pulse")} />
        {status.pending > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">
            {status.pending}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              DevTools de Sincronización
            </SheetTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceSync}
                disabled={isForceSyncing || status.pending === 0 || !isOnline}
                className="h-7 text-xs"
              >
                {isForceSyncing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Sync
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyReport} disabled={isCopyingReport} className="h-7 text-xs">
                {isCopyingReport ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : reportCopied ? (
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {reportCopied ? "OK" : "Reporte"}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClearStorage} disabled={clearSync.isPending} className="h-7 text-xs">
                {clearSync.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Limpiar
              </Button>
            </div>
          </div>
        </SheetHeader>

        {!isInitialized ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-muted-foreground">Inicializando base de datos...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 py-4 pr-1">
              <div className="grid grid-cols-5 gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1">
                {OPERATION_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                      activeTab === tab.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "status" && (
                <StatusTab
                  status={status}
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  isStuck={syncState.isStuck}
                  lastSyncTime={syncState.lastSyncTime}
                  consecutiveFailures={syncState.pull.consecutiveFailures}
                />
              )}
              {activeTab === "operations" && (
                <OperationsTab
                  operations={operations}
                  onDeleteOperation={handleDeleteOperation}
                  onDeleteAll={handleDeleteAllOperations}
                  canDelete={!!syncService}
                />
              )}
              {activeTab === "dead-letter" && (
                <DLQTab
                  deadLetterOperations={deadLetterOperations}
                  onRetry={handleRetryDeadLetter}
                  onDelete={handleDeleteDeadLetter}
                  onClearAll={handleClearDeadLetter}
                  canAct={!!syncService}
                />
              )}
              {activeTab === "tables" && <TablesTab entitySummaries={entitySummaries} />}
              {activeTab === "database" && <DatabaseTab dbInfo={dbInfo} />}
              {activeTab === "timeline" && <TimelineTab />}
              {activeTab === "metrics" && <MetricsTab />}
              {activeTab === "performance" && <PerformanceTab />}
            </div>
          </ScrollArea>
        )}
        <DeleteConfirmDialog />
      </SheetContent>
    </Sheet>
  );
}