import { useCallback, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSyncState, useSyncStatus } from "~/lib/sync/service-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";

type SyncState = "synced" | "syncing" | "pending" | "error" | "offline";

interface SyncStatusIndicatorProps {
  className?: string;
  display?: "badge" | "icon";
  compact?: boolean;
  onManualSync?: () => Promise<void>;
}

export function SyncStatusIndicator({
  className,
  display = "badge",
  compact = false,
  onManualSync,
}: SyncStatusIndicatorProps) {
  const { isOnline } = useSyncStatus();
  const { lastSyncTime } = useSyncState();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Determine sync state based on context
  const getSyncState = useCallback((): SyncState => {
    if (!isOnline) return "offline";
    if (isManualSyncing) return "syncing";
    if (lastSyncTime) {
      const timeSinceSync = Date.now() - lastSyncTime.getTime();
      // If last sync was recent (< 30 seconds), consider synced
      if (timeSinceSync < 30_000) return "synced";
      // Otherwise pending (stale)
      return "pending";
    }
    return "pending";
  }, [isOnline, isManualSyncing, lastSyncTime]);

  const syncState = getSyncState();

  const handleManualSync = useCallback(async () => {
    if (!onManualSync || isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      await onManualSync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [onManualSync, isManualSyncing]);

  // Configuration for each state
  const stateConfig = {
    synced: {
      icon: CheckCircle2,
      label: "Sincronizado",
      variant: "default" as const,
      className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
      iconClassName: "text-green-600",
      iconContainerClassName: "bg-green-50",
      description: lastSyncTime
        ? `Última sincronización: ${lastSyncTime.toLocaleTimeString("es-PE")}`
        : "Datos sincronizados",
    },
    syncing: {
      icon: RefreshCw,
      label: "Sincronizando...",
      variant: "default" as const,
      className: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200",
      iconClassName: "text-orange-600 animate-spin",
      iconContainerClassName: "bg-orange-50",
      description: "Sincronizando datos con el servidor",
    },
    pending: {
      icon: Cloud,
      label: "Pendiente",
      variant: "default" as const,
      className: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 cursor-pointer",
      iconClassName: "text-orange-600",
      iconContainerClassName: "bg-orange-50 hover:bg-orange-100",
      description: "Hay cambios pendientes por sincronizar. Click para sincronizar ahora.",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200 cursor-pointer",
      iconClassName: "text-red-600",
      iconContainerClassName: "bg-red-50 hover:bg-red-100",
      description: "Error de sincronización. Click para reintentar.",
    },
    offline: {
      icon: CloudOff,
      label: "Sin conexión",
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200",
      iconClassName: "text-gray-500",
      iconContainerClassName: "bg-gray-100",
      description: "Sin conexión a internet. Los cambios se guardarán localmente.",
    },
  };

  const config = stateConfig[syncState];
  const Icon = config.icon;
  const isInteractive = (syncState === "pending" || syncState === "error") && !!onManualSync;
  const shouldHideLabel = compact || display === "icon";

  if (display === "icon") {
    const iconContent = <Icon className={cn("h-4 w-4", config.iconClassName)} />;

    if (isInteractive) {
      return (
        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            config.iconContainerClassName,
            className
          )}
          onClick={handleManualSync}
          disabled={isManualSyncing}
          title={config.description}
          aria-label={config.label}
        >
          {iconContent}
        </button>
      );
    }

    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          config.iconContainerClassName,
          className
        )}
        title={config.description}
        aria-label={config.label}
      >
        {iconContent}
      </div>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1.5 px-2.5 py-1 font-medium transition-all duration-200",
        config.className,
        isInteractive && "cursor-pointer",
        className
      )}
      onClick={isInteractive ? handleManualSync : undefined}
      title={config.description}
    >
      <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} />
      {!shouldHideLabel && <span>{config.label}</span>}
    </Badge>
  );
}

export function SyncStatusButton({
  onManualSync,
  className,
}: {
  onManualSync?: () => Promise<void>;
  className?: string;
}) {
  const { isOnline } = useSyncStatus();
  const { lastSyncTime } = useSyncState();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const getSyncState = useCallback((): SyncState => {
    if (!isOnline) return "offline";
    if (isManualSyncing) return "syncing";
    if (lastSyncTime) {
      const timeSinceSync = Date.now() - lastSyncTime.getTime();
      if (timeSinceSync < 30_000) return "synced";
      return "pending";
    }
    return "pending";
  }, [isOnline, isManualSyncing, lastSyncTime]);

  const syncState = getSyncState();

  const handleManualSync = useCallback(async () => {
    if (!onManualSync || isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      await onManualSync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [onManualSync, isManualSyncing]);

  const stateConfig = {
    synced: {
      icon: CheckCircle2,
      label: "Sincronizado",
      className: "bg-green-100 text-green-700 hover:bg-green-200",
    },
    syncing: {
      icon: RefreshCw,
      label: "Sincronizando...",
      className: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    },
    pending: {
      icon: Cloud,
      label: "Pendiente",
      className: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      className: "bg-red-100 text-red-700 hover:bg-red-200",
    },
    offline: {
      icon: CloudOff,
      label: "Sin conexión",
      className: "bg-gray-100 text-gray-600 hover:bg-gray-200",
    },
  };

  const config = stateConfig[syncState];
  const Icon = config.icon;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-2", config.className, className)}
      onClick={handleManualSync}
      disabled={isManualSyncing || !onManualSync}
    >
      <Icon className={cn("h-4 w-4", isManualSyncing && "animate-spin")} />
      {config.label}
    </Button>
  );
}
