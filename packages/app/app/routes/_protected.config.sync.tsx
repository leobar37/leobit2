import { useState } from "react";
import { useSyncEngine, useSyncEngineReady, useSyncState, useSyncOperations } from "@avileo/drizzle-sync/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  Play,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import { useSync } from "~/components/sync/sync-status";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useToast } from "~/hooks/use-toast";
import { useDevToolsData } from "@avileo/drizzle-sync/react/devtools";
import { TablesTab, OperationsTab, DLQTab } from "@avileo/drizzle-sync/react/devtools";

export default function SyncAdminPage() {
  const engine = useSyncEngine();
  const { isReady: isInitialized } = useSyncEngineReady();
  const engineOnline = engine.getStatus().isOnline;
  const { isSyncing } = useSyncState();
  const { isOnline, actualIsOnline } = useSync();
  const syncService = useSyncOperations();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { toast } = useToast();
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("operations");

  const { status, operations, deadLetterOperations, entitySummaries, refetch } =
    useDevToolsData(true, isInitialized);

  const handleForceSync = async () => {
    if (!isInitialized) return;
    setIsForceSyncing(true);
    try {
      if (!actualIsOnline) {
        toast.error("No hay conexión a internet");
        return;
      }
      await engine.triggerSync();
      toast.success("Sincronización iniciada");
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Error en sincronización");
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleDeleteOperation = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar operación",
      description: "¿Estás seguro de eliminar esta operación?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!confirmed || !syncService) return;

    try {
      await syncService.deleteOperation(id);
      toast.success("Operación eliminada");
      await refetch();
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleDeleteAllOperations = async () => {
    const confirmed = await confirm({
      title: "Eliminar todas las operaciones",
      description:
        "Esto eliminará todas las operaciones con problemas. ¿Continuar?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!confirmed || !syncService) return;

    try {
      await syncService.deleteOperations(operations.map((op) => op.id));
      toast.success("Operaciones eliminadas");
      await refetch();
    } catch (error) {
      console.error("Error deleting operations:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleRetryDLQ = async (id: string) => {
    if (!syncService) return;
    try {
      await syncService.retryDeadLetterOperation(id);
      toast.success("Operación reintentada");
      await refetch();
    } catch (error) {
      console.error("Error retrying DLQ operation:", error);
      toast.error("Error al reintentar");
    }
  };

  const handleDeleteDLQ = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar de DLQ",
      description: "¿Eliminar esta operación de la cola de mensajes fallidos?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!confirmed || !syncService) return;

    try {
      await syncService.deleteDeadLetterOperation(id);
      toast.success("Operación eliminada de DLQ");
      await refetch();
    } catch (error) {
      console.error("Error deleting DLQ operation:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleClearDLQ = async () => {
    const confirmed = await confirm({
      title: "Vaciar DLQ",
      description:
        "Esto eliminará TODAS las operaciones de la cola de mensajes fallidos. No se reintentarán.",
      confirmText: "Vaciar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!confirmed || !syncService) return;

    try {
      await syncService.clearDeadLetterOperations();
      toast.success("DLQ vaciado");
      await refetch();
    } catch (error) {
      console.error("Error clearing DLQ:", error);
      toast.error("Error al vaciar DLQ");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Administración de Sync</h1>
          <p className="text-muted-foreground">
            Gestiona operaciones de sincronización
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={engineOnline ? "bg-green-50" : "bg-red-50"}
          >
            {engineOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={!isInitialized}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => void handleForceSync()}
            disabled={!isInitialized || isForceSyncing || isSyncing}
          >
            {isForceSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-1">Sincronizar</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pendientes</span>
            </div>
            <p className="text-2xl font-bold">{status.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Fallidas</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {status.failed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">DLQ</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {status.deadLetter}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                Completadas
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {status.completed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
          <TabsTrigger value="dlq">Dead Letter</TabsTrigger>
          <TabsTrigger value="tables">Tablas</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Operaciones con problemas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OperationsTab
                operations={operations}
                onDeleteOperation={handleDeleteOperation}
                onDeleteAll={handleDeleteAllOperations}
                canDelete={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dead Letter Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <DLQTab
                deadLetterOperations={deadLetterOperations}
                onRetry={handleRetryDLQ}
                onDelete={handleDeleteDLQ}
                onClearAll={handleClearDLQ}
                canAct={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Estado de tablas local
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TablesTab entitySummaries={entitySummaries} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
