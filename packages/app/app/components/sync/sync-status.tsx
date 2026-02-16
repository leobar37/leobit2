import { createContext, useContext } from "react";
import { CheckCircle, Clock, WifiOff } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSyncEngine } from "~/hooks/use-sync-engine";

type SyncStatus = "synced" | "pending" | "offline" | "error";

interface SyncContextType {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  isConnected: boolean;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  status: "offline",
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  isConnected: false,
  forceSync: async () => undefined,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const {
    status: engineStatus,
    pendingCount,
    lastSyncAt,
    isSyncing,
    isConnected,
    forceSync,
  } = useSyncEngine();

  const status: SyncStatus = !isConnected
    ? "offline"
    : engineStatus === "error"
      ? "error"
      : pendingCount > 0 || isSyncing
        ? "pending"
        : "synced";

  return (
    <SyncContext.Provider
      value={{
        status,
        pendingCount,
        lastSyncAt,
        isSyncing,
        isConnected,
        forceSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncStatus() {
  return useContext(SyncContext);
}

export function SyncStatus() {
  const { status, pendingCount } = useSyncStatus();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
        status === "synced" && "bg-green-100 text-green-700",
        status === "pending" && "bg-yellow-100 text-yellow-700",
        status === "offline" && "bg-red-100 text-red-700",
        status === "error" && "bg-red-100 text-red-700"
      )}
    >
      {status === "synced" && <CheckCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "offline" && <WifiOff className="w-3 h-3" />}
      {status === "error" && <WifiOff className="w-3 h-3" />}

      {status === "synced" && "Sincronizado"}
      {status === "pending" && `${pendingCount} pendientes`}
      {status === "offline" && "Sin conexión"}
      {status === "error" && "Error de sincronización"}
    </div>
  );
}
