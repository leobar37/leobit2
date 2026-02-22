import { createContext, useContext } from "react";
import { CheckCircle, Clock, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSyncEngine } from "~/hooks/use-sync-engine";

type SyncStatus = "synced" | "pending" | "offline" | "error";

interface SyncContextType {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  isConnected: boolean;
  lastError: string | null;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  status: "offline",
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  isConnected: false,
  lastError: null,
  forceSync: async () => undefined,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const {
    status: engineStatus,
    pendingCount,
    lastSyncAt,
    isSyncing,
    isConnected,
    lastError,
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
        lastError,
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
  const { status, pendingCount, lastError } = useSyncStatus();
  const hasError = lastError !== null && lastError !== undefined;

  return (
    <div className="space-y-2">
      {/* Status badge */}
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
        {status === "error" && <AlertCircle className="w-3 h-3" />}

        {status === "synced" && "Sincronizado"}
        {status === "pending" && `${pendingCount} pendientes`}
        {status === "offline" && "Sin conexión"}
        {status === "error" && "Error de sincronización"}
      </div>

      {/* Error message display */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Último error:</p>
              <p className="font-mono break-words text-[10px]">{lastError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
