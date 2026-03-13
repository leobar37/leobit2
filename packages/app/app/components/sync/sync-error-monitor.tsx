import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useClearSyncStorage } from "~/hooks/use-clear-sync-storage";
import { useSync } from "./sync-status";
import { cn } from "~/lib/utils";

/**
 * Shows a manual recovery dialog when Electric sync gets stuck in a must-refetch loop.
 */
export function SyncErrorMonitor() {
  const { syncIssue, dismissSyncIssue } = useSync();
  const clearSync = useClearSyncStorage();

  if (!syncIssue) return null;

  const issueDescription = syncIssue.type === "recoverable-error"
    ? `Se detectó un conflicto local de sincronización en ${syncIssue.table}. Conviene reiniciar el almacenamiento local para que Electric reconstruya la tabla sin duplicados.`
    : `Electric pidió reiniciar la sincronización de ${syncIssue.table}. Tu sesión se conservará, pero conviene reiniciar el almacenamiento local de sync para evitar que la app quede trabada.`;

  const handleRestartSync = async () => {
    await clearSync.mutateAsync({ preserveSession: true });
  };

  const handleContinue = () => {
    dismissSyncIssue();
  };

  return (
    <Drawer open={true} onOpenChange={(open) => !open && dismissSyncIssue()}>
      <DrawerContent className="bg-background">
        {/* Drag handle indicator */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon container with orange theme */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <DrawerTitle className="text-lg font-semibold text-foreground">
                Problema de sincronización
              </DrawerTitle>
            </div>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleContinue}
                className="rounded-xl -mr-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription className="pt-3 text-left text-sm text-muted-foreground leading-relaxed">
            {issueDescription}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter className={cn("flex-col gap-3 pt-2 pb-6")}>
          <Button
            onClick={handleRestartSync}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium"
            disabled={clearSync.isPending}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", clearSync.isPending && "animate-spin")} />
            {clearSync.isPending ? "Reiniciando..." : "Reiniciar sincronización"}
          </Button>

          <Button
            variant="ghost"
            onClick={handleContinue}
            className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground"
          >
            Seguir por ahora
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
