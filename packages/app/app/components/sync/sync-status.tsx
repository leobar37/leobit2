import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SyncContextValue {
  isOnline: boolean;
  lastSync: Date | null;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  lastSync: null,
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, lastSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}

export function SyncStatus() {
  const { isOnline } = useSync();
  return null;
}
