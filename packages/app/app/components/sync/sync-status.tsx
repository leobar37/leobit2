import { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle, Clock, WifiOff } from "lucide-react";
import { cn } from "~/lib/utils";

type SyncStatus = "synced" | "pending" | "offline";

interface SyncContextType {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
}

const SyncContext = createContext<SyncContextType>({
  status: "offline",
  pendingCount: 0,
  lastSyncAt: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? "synced" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setStatus("synced");
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ status, pendingCount, lastSyncAt }}>
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
        status === "offline" && "bg-red-100 text-red-700"
      )}
    >
      {status === "synced" && <CheckCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "offline" && <WifiOff className="w-3 h-3" />}

      {status === "synced" && "Sincronizado"}
      {status === "pending" && `${pendingCount} pendientes`}
      {status === "offline" && "Sin conexión"}
    </div>
  );
}
