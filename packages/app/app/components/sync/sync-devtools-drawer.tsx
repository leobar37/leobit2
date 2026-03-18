import { useState, useEffect, useCallback } from "react";
import { useEngine, getDatabase } from "~/engine";
import { useClearSyncStorage } from "@/hooks/use-clear-sync-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Database,
  Trash2,
  Play,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Search,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useSync } from "~/components/sync/sync-status";
import { useSyncService } from "~/lib/sync/service-provider";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { runManualSync } from "~/lib/sync/manual-sync";
import { useToast } from "~/hooks/use-toast";
import { useListSearch } from "~/hooks/use-list-search";

interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

interface SyncOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  sync_attempts: number;
  last_error: string | null;
  created_at: string;
}

interface DeadLetterOperation {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  error: string;
  original_error: string | null;
  sync_attempts: number;
  created_at: string;
}

interface EntitySyncSummary {
  table: string;
  label: string;
  total: number;
  pending: number;
  synced: number;
  error: number;
}

const ENTITY_LABELS: Record<string, string> = {
  customers: "Clientes",
  products: "Productos",
  suppliers: "Proveedores",
  product_variants: "Variantes",
  inventory: "Inventario",
  variant_inventory: "Inventario por variante",
  sales: "Ventas",
  purchases: "Compras",
  abonos: "Abonos",
  sale_items: "Items de venta",
  purchase_items: "Items de compra",
  distribuciones: "Distribuciones",
  distribucion_items: "Items de distribución",
  closings: "Cierres",
  tags: "Etiquetas",
  customer_tags: "Etiquetas por cliente",
};

const TABLES_WITH_SYNC_STATUS = new Set([
  "customers",
  "products",
  "suppliers",
  "product_variants",
  "sales",
  "purchases",
  "abonos",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "closings",
  "tags",
  "customer_tags",
]);

// Tables synced from server (pull sync)
const SYNCED_TABLES = [
  "customers",
  "products",
  "suppliers",
  "product_variants",
  "inventory",
  "variant_inventory",
  "sales",
  "purchases",
  "abonos",
  "sale_items",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "closings",
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
] as const;

const ENTITY_SUMMARY_CONFIG = SYNCED_TABLES.map((table) => ({
  table,
  label: ENTITY_LABELS[table] ?? table,
  hasSyncStatus: TABLES_WITH_SYNC_STATUS.has(table),
}));

const OPERATION_TABS = [
  { value: "tables", label: "Tablas" },
  { value: "operations", label: "Operaciones" },
  { value: "dead-letter", label: "DLQ" },
] as const;

type ActiveTab = (typeof OPERATION_TABS)[number]["value"];

interface SyncDevToolsDrawerProps {
  triggerClassName?: string;
}

export function SyncDevToolsDrawer({
  triggerClassName,
}: SyncDevToolsDrawerProps = {}) {
  const { isOnline: engineOnline, isSyncing, isInitialized } = useEngine();
  const {
    isOnline,
    actualIsOnline,
    isSimulatedOffline,
    setSimulatedOffline,
  } = useSync();
  const syncService = useSyncService();
  const { confirm, ConfirmDialog: DeleteConfirmDialog } = useConfirmDialog();
  const clearSync = useClearSyncStorage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    processing: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    conflict: 0,
    deadLetter: 0,
    total: 0,
  });
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [deadLetterOperations, setDeadLetterOperations] = useState<
    DeadLetterOperation[]
  >([]);
  const [entitySummaries, setEntitySummaries] = useState<EntitySyncSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tables");
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const { filteredItems: filteredEntitySummaries, search: tableSearch, setSearch: setTableSearch } = useListSearch({
    items: entitySummaries,
    searchFields: [(summary) => summary.label, (summary) => summary.table],
    debounceMs: 150,
  });

  const {
    filteredItems: filteredOperations,
    search: operationSearch,
    setSearch: setOperationSearch,
  } = useListSearch({
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

  const {
    filteredItems: filteredDeadLetterOperations,
    search: deadLetterSearch,
    setSearch: setDeadLetterSearch,
  } = useListSearch({
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

  const fetchData = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const newStatus = syncService ? await syncService.getStatus() : status;
      setStatus(newStatus);

      if (syncService) {
        const [problemOps, deadLetterOps] = await Promise.all([
          syncService.getProblemOperations(),
          syncService.getDeadLetterOperations(),
        ]);

        setOperations(problemOps as unknown as SyncOperation[]);
        setDeadLetterOperations(deadLetterOps as unknown as DeadLetterOperation[]);
      }

      const { db } = getDatabase();
      const summaryResults = await Promise.all(
        ENTITY_SUMMARY_CONFIG.map(async ({ table, label, hasSyncStatus }) => {
          if (hasSyncStatus) {
            const result = await db.execute(`
              SELECT
                '${table}' AS table_name,
                '${label}' AS label,
                COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE sync_status = 'pending')::text AS pending,
                COUNT(*) FILTER (WHERE sync_status = 'synced')::text AS synced,
                COUNT(*) FILTER (WHERE sync_status = 'error')::text AS error
              FROM ${table}
            `);

            const row = result.rows[0];
            return {
              table: String(row.table_name),
              label: String(row.label),
              total: parseInt(String(row.total), 10),
              pending: parseInt(String(row.pending), 10),
              synced: parseInt(String(row.synced), 10),
              error: parseInt(String(row.error), 10),
            };
          }

          const result = await db.execute(`
            SELECT
              '${table}' AS table_name,
              '${label}' AS label,
              COUNT(*)::text AS total
            FROM ${table}
          `);

          const row = result.rows[0];
          return {
            table: String(row.table_name),
            label: String(row.label),
            total: parseInt(String(row.total), 10),
            pending: 0,
            synced: parseInt(String(row.total), 10),
            error: 0,
          };
        }),
      );

      setEntitySummaries(summaryResults);
    } catch (error) {
      console.error("[SyncDevTools] Error fetching data:", error);
    }
  }, [isInitialized, syncService]);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, isOpen, isInitialized]);

  const handleForceSync = async () => {
    if (!isInitialized) return;
    setIsLoading(true);
    try {
      await runManualSync({ actualOnline: actualIsOnline });
      setLastSync(new Date());
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsLoading(false);
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

    if (!confirmed) {
      return;
    }

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

    if (!confirmed) {
      return;
    }

    const success = await syncService.deleteOperation(operationId);
    if (success) {
      toast.success("Operación eliminada", {
        description: "La operación se quitó de la cola local.",
      });
      await fetchData();
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

    if (!confirmed) {
      return;
    }

    const operationIds = operations.map((op) => op.id);
    const deletedCount = await syncService.deleteOperations(operationIds);

    if (deletedCount > 0) {
      toast.success("Operaciones eliminadas", {
        description: `${deletedCount} operaciones eliminadas correctamente.`,
      });
      await fetchData();
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
      await fetchData();
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

    if (!confirmed) {
      return;
    }

    const success = await syncService.deleteDeadLetterOperation(deadLetterId);
    if (success) {
      toast.success("Registro eliminado", {
        description: "La operación se quitó del dead letter.",
      });
      await fetchData();
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

    if (!confirmed) {
      return;
    }

    const deletedCount = await syncService.clearDeadLetterOperations();
    toast.success("Dead letter vaciado", {
      description:
        deletedCount > 0
          ? `Se eliminaron ${deletedCount} operaciones.`
          : "No había operaciones en dead letter.",
    });
    await fetchData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "conflict":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
  }) => (
    <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  const getEntityTone = (summary: EntitySyncSummary) => {
    if (summary.error > 0) return "border-red-200 bg-red-50/80";
    if (summary.pending > 0) return "border-orange-200 bg-orange-50/80";
    return "border-green-200 bg-green-50/70";
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
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              DevTools de Sincronización
            </SheetTitle>
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
              {import.meta.env.DEV && isSimulatedOffline && actualIsOnline && (
                <Badge
                  variant="outline"
                  className="border-orange-200 text-orange-700"
                >
                  Simulado
                </Badge>
              )}
            </div>
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Último sync: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </SheetHeader>

        {!isInitialized ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-muted-foreground">
                Inicializando base de datos...
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 py-4 pr-1">
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Pendientes"
                  value={status.pending}
                  icon={Clock}
                  color="bg-yellow-500"
                />
                <StatCard
                  label="Fallidos"
                  value={status.failed}
                  icon={XCircle}
                  color="bg-red-500"
                />
                <StatCard
                  label="Conflictos"
                  value={status.conflict}
                  icon={AlertTriangle}
                  color="bg-orange-500"
                />
                <StatCard
                  label="Completados"
                  value={status.completed}
                  icon={CheckCircle}
                  color="bg-green-500"
                />
                <StatCard
                  label="Dead Letter"
                  value={status.deadLetter}
                  icon={Database}
                  color="bg-gray-500"
                />
                <StatCard
                  label="Total"
                  value={status.total}
                  icon={Database}
                  color="bg-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleForceSync}
                  disabled={isLoading || status.pending === 0 || !isOnline}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Forzar Sync
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyReport}
                  disabled={isCopyingReport}
                >
                  {isCopyingReport ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : reportCopied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {reportCopied ? "Copiado" : "Reporte"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearStorage}
                  disabled={clearSync.isPending}
                >
                  {clearSync.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Limpiar
                </Button>
              </div>

              {import.meta.env.DEV && (
                <div>
                  <button
                    type="button"
                    onClick={() => setSimulatedOffline(!isSimulatedOffline)}
                    className="flex w-full items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Simular sin conexion
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fuerza el estado offline en la UI y bloquea el sync
                        manual.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{isSimulatedOffline ? "Activo" : "Inactivo"}</span>
                      {isSimulatedOffline ? (
                        <ToggleRight className="h-5 w-5 text-orange-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {!engineOnline && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      La red real ya esta offline; el simulador no cambia ese
                      estado.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1">
                  {OPERATION_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        activeTab === tab.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "tables" ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Entidades sincronizadas
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {entitySummaries.length} tablas detectadas
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white/80">
                        {filteredEntitySummaries.length}/{entitySummaries.length}
                      </Badge>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar tabla..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
                      />
                    </div>

                    <div className="space-y-2">
                      {filteredEntitySummaries.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                          No se encontraron tablas.
                        </div>
                      ) : (
                        filteredEntitySummaries.map((summary) => (
                          <div
                            key={summary.table}
                            className={`rounded-xl border px-3 py-3 ${getEntityTone(summary)}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{summary.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  Total local: {summary.total}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-white/80">
                                {summary.table}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className="bg-white/80 text-orange-700"
                              >
                                Pendientes: {summary.pending}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-white/80 text-green-700"
                              >
                                Synced: {summary.synced}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-white/80 text-red-700"
                              >
                                Error: {summary.error}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : activeTab === "operations" ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Operaciones con problema
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Pendientes, fallidas o en conflicto
                        </p>
                      </div>
                      {operations.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                          onClick={handleDeleteAllOperations}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar todas
                        </Button>
                      )}
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar operación..."
                        value={operationSearch}
                        onChange={(e) => setOperationSearch(e.target.value)}
                        className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
                      />
                    </div>

                    <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
                      {filteredOperations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>
                            {operationSearch
                              ? "No se encontraron operaciones"
                              : "No hay operaciones pendientes"}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredOperations.map((op) => (
                            <div
                              key={op.id}
                              className="p-3 hover:bg-muted/50 sm:p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(op.status)}
                                  <span className="font-medium capitalize">
                                    {op.entity_type}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {op.operation}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(op.created_at).toLocaleTimeString()}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-6 w-6",
                                      syncService
                                        ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                                        : "text-muted-foreground cursor-not-allowed"
                                    )}
                                    onClick={() => handleDeleteOperation(op.id)}
                                    title={syncService ? "Eliminar operación" : "Servicio no disponible"}
                                    disabled={!syncService}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                <span className="font-mono">{op.entity_id}</span>
                                {op.sync_attempts > 0 && (
                                  <span className="ml-2">
                                    Intentos: {op.sync_attempts}
                                  </span>
                                )}
                              </div>
                              {op.last_error && (
                                <div className="mt-1 text-xs leading-5 text-red-500 line-clamp-2">
                                  {op.last_error}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
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
                          onClick={handleClearDeadLetter}
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
                        value={deadLetterSearch}
                        onChange={(e) => setDeadLetterSearch(e.target.value)}
                        className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
                      />
                    </div>

                    <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
                      {filteredDeadLetterOperations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>
                            {deadLetterSearch
                              ? "No se encontraron operaciones en DLQ"
                              : "No hay operaciones en dead letter"}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredDeadLetterOperations.map((op) => (
                            <div key={op.id} className="p-3 hover:bg-muted/50 sm:p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  <span className="font-medium capitalize">{op.entity_type}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {op.operation}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(op.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                <span className="font-mono">{op.entity_id}</span>
                                <span className="ml-2">Intentos: {op.sync_attempts}</span>
                              </div>
                              <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs leading-5 text-red-600">
                                {op.original_error ?? op.error}
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleRetryDeadLetter(op.id)}
                                  disabled={!syncService}
                                >
                                  <Play className="h-3.5 w-3.5 mr-1" />
                                  Reintentar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => void handleDeleteDeadLetter(op.id)}
                                  disabled={!syncService}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
        <DeleteConfirmDialog />
      </SheetContent>
    </Sheet>
  );
}
