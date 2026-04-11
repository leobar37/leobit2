import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface SyncContextValue {
  isOnline: boolean;
  actualIsOnline: boolean;
  lastSync: Date | null;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  actualIsOnline: true,
  lastSync: null,
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [actualIsOnline, setActualIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const isOnline = actualIsOnline;

  useEffect(() => {
    const handleOnline = () => setActualIsOnline(true);
    const handleOffline = () => setActualIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update lastSync when online status changes to true
  useEffect(() => {
    if (isOnline) {
      setLastSync(new Date());
    }
  }, [isOnline]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        actualIsOnline,
        lastSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}

export function SyncStatus() {
  return null;
}
