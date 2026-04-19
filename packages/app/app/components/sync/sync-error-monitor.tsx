import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useClearSyncStorage } from "~/hooks/use-clear-sync-storage";
import { useSyncStatus } from "~/lib/sync/service-provider";
import { cn } from "~/lib/utils";

/**
 * Shows sync status and provides manual recovery options.
 * Works with REST-based custom sync (no Electric sync).
 */
export function SyncErrorMonitor() {
  const { isOnline } = useSyncStatus();
  const clearSync = useClearSyncStorage();

  // Don't show anything if online
  if (isOnline) {
    return null;
  }

  const issueDescription = "No hay conexión a internet. Los datos se guardarán localmente y se sincronizarán automáticamente cuando vuelva la conexión.";

  const handleRestartSync = async () => {
    await clearSync.mutateAsync({ preserveSession: true });
  };

  return (
    <Drawer open={true}>
      <DrawerContent className="bg-background">
        {/* Drag handle indicator */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <DrawerHeader className="space-y-3 px-5 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon container with orange theme */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <DrawerTitle className="text-lg font-semibold text-foreground">
                Sin conexión
              </DrawerTitle>
            </div>
          </div>
          <DrawerDescription className="text-left text-sm text-muted-foreground leading-relaxed">
            {issueDescription}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter className="flex-col gap-2 px-5 pt-2 pb-6 mt-auto">
          <Button
            onClick={handleRestartSync}
            variant="outline"
            className="w-full h-12 rounded-xl"
            disabled={clearSync.isPending}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", clearSync.isPending && "animate-spin")} />
            {clearSync.isPending ? "Reiniciando..." : "Reiniciar almacenamiento local"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
