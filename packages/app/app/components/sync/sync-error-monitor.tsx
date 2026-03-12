import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClearSyncStorage } from "~/hooks/use-clear-sync-storage";
import { useSync } from "./sync-status";

/**
 * Shows a manual recovery dialog when Electric sync gets stuck in a must-refetch loop.
 */
export function SyncErrorMonitor() {
  const { syncIssue, dismissSyncIssue } = useSync();
  const clearSync = useClearSyncStorage();

  if (!syncIssue) return null;

  const handleRestartSync = async () => {
    await clearSync.mutateAsync({ preserveSession: true });
  };

  const handleContinue = () => {
    dismissSyncIssue();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && dismissSyncIssue()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Problema de sincronización detectado
          </DialogTitle>
          <DialogDescription className="pt-4">
            Electric pidió reiniciar la sincronización de <strong>{syncIssue.table}</strong>. Tu sesión se conservará, pero conviene reiniciar el almacenamiento local de sync para evitar que la app quede trabada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleRestartSync}
            className="w-full"
            disabled={clearSync.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${clearSync.isPending ? "animate-spin" : ""}`} />
            {clearSync.isPending ? "Reiniciando..." : "Reiniciar sincronización"}
          </Button>

          <Button
            variant="ghost"
            onClick={handleContinue}
            className="w-full"
          >
            Seguir por ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
