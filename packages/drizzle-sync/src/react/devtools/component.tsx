/**
 * SyncDevTools - Floating debug widget and drawer for sync diagnostics
 *
 * Usage:
 * ```tsx
 * import { SyncDevToolsProvider, SyncDevTools } from "@avileo/drizzle-sync/react/devtools";
 *
 * <SyncDevToolsProvider config={{ onClearStorage: async () => {...} }}>
 *   <App />
 * </SyncDevToolsProvider>
 *
 * // Somewhere in your layout:
 * <SyncDevTools enabled={import.meta.env.DEV} />
 * ```
 */

import { useState, useId } from "react";
import { useSyncEngine, useSyncState, useSyncStatus, useSyncOperations, useSyncEngineReady } from "../hooks";
import { Bug, X, Database, Wifi, WifiOff, Loader2, Play, Copy, Check, Trash2 } from "lucide-react";
import { cn, Button, ScrollArea } from "./ui/primitives";
import { useDevToolsConfig } from "./provider";
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

interface SyncDevToolsProps {
  enabled?: boolean;
}

export function SyncDevTools({ enabled = true }: SyncDevToolsProps) {
  if (!enabled) return null;
  return <SyncDevToolsInner />;
}

function SyncDevToolsInner() {
  const engine = useSyncEngine();
  const { isReady: isInitialized } = useSyncEngineReady();
  const syncState = useSyncState();
  const { isOnline } = useSyncStatus();
  const isSyncing = syncState.isSyncing;
  const syncService = useSyncOperations();
  const config = useDevToolsConfig();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("status");
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { status, operations, deadLetterOperations, entitySummaries, refetch } =
    useDevToolsData(isOpen, isInitialized);

  const { dbInfo } = useDatabaseData(isOpen, isInitialized);

  const sheetId = useId();

  const handleForceSync = async () => {
    if (!isInitialized) return;
    setIsForceSyncing(true);
    try {
      const coordinator = engine.getCoordinator();
      if (coordinator) {
        await coordinator.forceSync();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleClearStorage = async () => {
    if (!config.onClearStorage) {
      console.warn("[SyncDevTools] onClearStorage not configured");
      return;
    }

    const confirmed = window.confirm(
      "¿Limpiar almacenamiento local?\n\nEsto eliminará todos los datos locales. Esta acción no se puede deshacer."
    );

    if (!confirmed) return;
    setIsClearing(true);
    try {
      await config.onClearStorage();
    } catch (error) {
      console.error("[SyncDevTools] Error clearing storage:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCopyReport = async () => {
    setIsCopyingReport(true);
    try {
      const report = generateDiagnosticReport(status, syncState, dbInfo, operations, deadLetterOperations);
      await navigator.clipboard.writeText(report);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    } catch (error) {
      console.error("[SyncDevTools] Error copying report:", error);
    } finally {
      setIsCopyingReport(false);
    }
  };

  const handleDeleteOperation = async (operationId: string) => {
    if (!syncService) {
      window.alert("El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.");
      return;
    }

    const confirmed = window.confirm("¿Estás seguro de eliminar esta operación de sincronización?");
    if (!confirmed) return;

    const success = await syncService.deleteOperation(operationId);
    if (success) {
      await refetch();
    }
  };

  const handleDeleteAllOperations = async () => {
    if (!syncService) {
      window.alert("El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.");
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar las ${operations.length} operaciones de sincronización? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    const operationIds = operations.map((op) => op.id);
    const deletedCount = await syncService.deleteOperations(operationIds);
    if (deletedCount > 0) {
      await refetch();
    }
  };

  const handleRetryDeadLetter = async (deadLetterId: string) => {
    if (!syncService) {
      window.alert("El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.");
      return;
    }

    const success = await syncService.retryDeadLetterOperation(deadLetterId);
    if (success) {
      await refetch();
    }
  };

  const handleDeleteDeadLetter = async (deadLetterId: string) => {
    if (!syncService) {
      window.alert("El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.");
      return;
    }

    const confirmed = window.confirm("¿Estás seguro de eliminar esta operación de dead letter?");
    if (!confirmed) return;

    const success = await syncService.deleteDeadLetterOperation(deadLetterId);
    if (success) {
      await refetch();
    }
  };

  const handleClearDeadLetter = async () => {
    if (!syncService) {
      window.alert("El servicio de sincronización aún no está listo. Intenta de nuevo en unos segundos.");
      return;
    }

    const confirmed = window.confirm(
      "Se eliminarán todas las operaciones apartadas en dead letter para este negocio."
    );

    if (!confirmed) return;

    const deletedCount = await syncService.clearDeadLetterOperations();
    await refetch();
  };

  const triggerTone = !isInitialized
    ? "text-gray-400"
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
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn("fixed z-50 transition-all duration-300 ease-out", "right-4 bottom-20")}>
        {isOpen ? (
          <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:bottom-4 sm:w-[500px] sm:max-h-[80vh] bg-white border rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <span className="font-semibold">DevTools de Sincronización</span>
              </div>
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
                {config.onClearStorage && (
                  <Button size="sm" variant="destructive" onClick={handleClearStorage} disabled={isClearing} className="h-7 text-xs">
                    {isClearing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Limpiar
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isInitialized ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-500" />
                  <p className="text-gray-500">Inicializando base de datos...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 rounded-2xl border border-gray-200 bg-gray-50/40 p-1">
                    {OPERATION_TABS.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          "rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                          activeTab === tab.value
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
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
                      consecutiveFailures={0}
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
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-purple-500 text-white shadow-lg",
              "hover:bg-purple-600 transition-colors",
              "border-2 border-purple-300"
            )}
            title="Debug Tools"
          >
            <Bug className="h-5 w-5" />
            {status.pending > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {status.pending}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
}

function generateDiagnosticReport(
  status: { pending: number; failed: number; conflict: number; deadLetter: number; total: number },
  syncState: { isOnline: boolean; isSyncing: boolean; isStuck: boolean },
  dbInfo: { totalRecords: number; tableCount: number },
  operations: Array<{ entity_type: string; status: string }>,
  deadLetter: Array<{ entity_type: string }>
): string {
  return `
=== SYNC DIAGNOSTIC REPORT ===
Generated: ${new Date().toISOString()}

## Status
- Online: ${syncState.isOnline ? "✅ Yes" : "❌ No"}
- Syncing: ${syncState.isSyncing ? "Yes" : "No"}
- Stuck: ${syncState.isStuck ? "⚠️ Yes" : "No"}

## Queue
- Pending: ${status.pending}
- Failed: ${status.failed}
- Conflicts: ${status.conflict}
- Dead Letter: ${status.deadLetter}
- Total: ${status.total}

## Database
- Total Records: ${dbInfo.totalRecords}
- Tables: ${dbInfo.tableCount}

## Operations
${operations.map((op) => `  - ${op.entity_type}: ${op.status}`).join("\n") || "  None"}

## Dead Letter
${deadLetter.map((op) => `  - ${op.entity_type}`).join("\n") || "  None"}
`.trim();
}
