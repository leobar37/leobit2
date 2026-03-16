import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getEffectiveOnlineStatus,
  getSimulatedOffline,
  setSimulatedOffline,
  subscribeToSimulatedOffline,
} from "~/lib/sync/dev-network-override";

interface SyncContextValue {
  isOnline: boolean;
  actualIsOnline: boolean;
  isSimulatedOffline: boolean;
  setSimulatedOffline: (value: boolean) => void;
  lastSync: Date | null;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  actualIsOnline: true,
  isSimulatedOffline: false,
  setSimulatedOffline: () => {},
  lastSync: null,
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [actualIsOnline, setActualIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState(getSimulatedOffline());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const isOnline = getEffectiveOnlineStatus(actualIsOnline);

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

  useEffect(() => {
    return subscribeToSimulatedOffline(setIsSimulatedOfflineState);
  }, []);

  // Update lastSync when online status changes to true
  useEffect(() => {
    if (isOnline && !isSimulatedOffline) {
      setLastSync(new Date());
    }
  }, [isOnline, isSimulatedOffline]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        actualIsOnline,
        isSimulatedOffline,
        setSimulatedOffline,
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
