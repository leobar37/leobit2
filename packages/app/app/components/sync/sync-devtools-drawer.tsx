import { useState, useEffect } from "react";
import { useEngine, getDatabase } from "~/engine";
import { useClearSyncStorage } from "@/hooks/use-clear-sync-storage";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useSync } from "~/components/sync/sync-status";
import { runManualSync } from "~/lib/sync/manual-sync";

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

interface EntitySyncSummary {
  table: string;
  label: string;
  total: number;
  pending: number;
  synced: number;
  error: number;
}

const ENTITY_SUMMARY_CONFIG = [
  { table: "customers", label: "Clientes" },
  { table: "sales", label: "Ventas" },
  { table: "abonos", label: "Abonos" },
  { table: "products", label: "Productos" },
] as const;

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
    syncIssue,
  } = useSync();
  const clearSync = useClearSyncStorage();
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
  const [entitySummaries, setEntitySummaries] = useState<EntitySyncSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    const fetchData = async () => {
      try {
        const { db } = getDatabase();

        const statusResult = await db.execute(`
          SELECT status, COUNT(*) as count 
          FROM sync_operations 
          GROUP BY status
        `);

        const newStatus: SyncStatus = {
          pending: 0,
          processing: 0,
          syncing: 0,
          completed: 0,
          failed: 0,
          conflict: 0,
          deadLetter: 0,
          total: 0,
        };

        for (const row of statusResult.rows) {
          const count = parseInt(row.count as string, 10);
          const key = row.status as keyof SyncStatus;
          if (key in newStatus) {
            newStatus[key] = count;
            newStatus.total += count;
          }
        }
        setStatus(newStatus);

        const opsResult = await db.execute(`
          SELECT id, entity_type, entity_id, operation, status, sync_attempts, last_error, created_at
          FROM sync_operations
          WHERE status IN ('pending', 'failed', 'conflict')
          ORDER BY created_at DESC
          LIMIT 50
        `);
        setOperations(opsResult.rows as unknown as SyncOperation[]);

        const summaryQueries = ENTITY_SUMMARY_CONFIG.map(
          ({ table, label }) => `
            SELECT
              '${table}' AS table_name,
              '${label}' AS label,
              COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE sync_status = 'pending')::text AS pending,
              COUNT(*) FILTER (WHERE sync_status = 'synced')::text AS synced,
              COUNT(*) FILTER (WHERE sync_status = 'error')::text AS error
            FROM ${table}
          `,
        ).join(" UNION ALL ");

        const summaryResult = await db.execute(summaryQueries);
        setEntitySummaries(
          summaryResult.rows.map((row) => ({
            table: String(row.table_name),
            label: String(row.label),
            total: parseInt(String(row.total), 10),
            pending: parseInt(String(row.pending), 10),
            synced: parseInt(String(row.synced), 10),
            error: parseInt(String(row.error), 10),
          })),
        );
      } catch (error) {
        console.error("[SyncDevTools] Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isOpen, isInitialized]);

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
    if (
      !confirm(
        "¿Estás seguro? Esto limpiará todos los datos locales de sincronización.",
      )
    ) {
      return;
    }
    await clearSync.mutateAsync({ preserveSession: true });
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
      : syncIssue || status.failed > 0 || status.conflict > 0
        ? "bg-red-50 text-red-600 hover:bg-red-100"
        : isSyncing
          ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
          : status.pending > 0
            ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
            : "bg-green-50 text-green-600 hover:bg-green-100";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-2xl transition-colors",
            triggerClassName,
            triggerTone,
          )}
          disabled={!isInitialized}
          title={
            syncIssue
              ? `Error de sincronización en ${syncIssue.table}`
              : status.pending > 0
                ? `Hay ${status.pending} cambios pendientes`
                : isOnline
                  ? "Sincronización al día"
                  : "Sin conexión"
          }
        >
          <Database className={cn("h-5 w-5", isSyncing && "animate-pulse")} />
          {status.pending > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">
              {status.pending}
            </span>
          )}
        </Button>
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

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Entidades sincronizadas
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    4 tablas clave
                  </span>
                </div>
                <div className="space-y-2">
                  {entitySummaries.map((summary) => (
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
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Operaciones con problema
                </h3>
                <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
                  {operations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No hay operaciones pendientes</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {operations.map((op) => (
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
                            <span className="text-xs text-muted-foreground">
                              {new Date(op.created_at).toLocaleTimeString()}
                            </span>
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
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
