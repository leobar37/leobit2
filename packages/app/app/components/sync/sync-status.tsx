import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { subscribeToElectricSyncEvents } from "~/lib/db/electric-sync-events";
import {
  getEffectiveOnlineStatus,
  getSimulatedOffline,
  setSimulatedOffline,
  subscribeToSimulatedOffline,
} from "~/lib/sync/dev-network-override";

const MUST_REFETCH_WINDOW_MS = 30_000;
const MUST_REFETCH_GRACE_MS = 8_000;

export interface SyncIssue {
  type: "must-refetch" | "recoverable-error";
  table: string;
  detectedAt: Date;
  count: number;
  reason?: "duplicate-key";
  error?: string;
}

interface SyncContextValue {
  isOnline: boolean;
  actualIsOnline: boolean;
  isSimulatedOffline: boolean;
  setSimulatedOffline: (value: boolean) => void;
  lastSync: Date | null;
  syncIssue: SyncIssue | null;
  dismissSyncIssue: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  actualIsOnline: true,
  isSimulatedOffline: false,
  setSimulatedOffline: () => {},
  lastSync: null,
  syncIssue: null,
  dismissSyncIssue: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [actualIsOnline, setActualIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState(getSimulatedOffline());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncIssue, setSyncIssue] = useState<SyncIssue | null>(null);
  const mustRefetchEvents = useRef(new Map<string, number[]>());
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const isOnline = getEffectiveOnlineStatus(actualIsOnline);

  const clearPendingTable = useCallback((table: string) => {
    const timer = pendingTimers.current.get(table);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.current.delete(table);
    }

    mustRefetchEvents.current.delete(table);
  }, []);

  const dismissSyncIssue = useCallback(() => {
    setSyncIssue(null);
  }, []);

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

  useEffect(() => {
    return subscribeToElectricSyncEvents((event) => {
      if (event.type === "up-to-date") {
        setLastSync(new Date(event.occurredAt));
        clearPendingTable(event.table);
        setSyncIssue((current) =>
          current?.table === event.table ? null : current
        );
        return;
      }

      const recentEvents = (
        mustRefetchEvents.current.get(event.table) ?? []
      ).filter((timestamp) => event.occurredAt - timestamp <= MUST_REFETCH_WINDOW_MS);

      recentEvents.push(event.occurredAt);
      mustRefetchEvents.current.set(event.table, recentEvents);

      if (!pendingTimers.current.has(event.table)) {
        const timer = setTimeout(() => {
          pendingTimers.current.delete(event.table);
          const count = mustRefetchEvents.current.get(event.table)?.length ?? 1;
          setSyncIssue({
            type: "must-refetch",
            table: event.table,
            detectedAt: new Date(event.occurredAt),
            count,
          });
        }, MUST_REFETCH_GRACE_MS);

        pendingTimers.current.set(event.table, timer);
      }

      if (recentEvents.length >= 2) {
        clearPendingTable(event.table);
        const firstTimestamp = recentEvents[0] ?? event.occurredAt;
        setSyncIssue({
          type: "must-refetch",
          table: event.table,
          detectedAt: new Date(firstTimestamp),
          count: recentEvents.length,
        });
      }

      if (event.type === "recoverable-error") {
        clearPendingTable(event.table);
        setSyncIssue({
          type: "recoverable-error",
          table: event.table,
          detectedAt: new Date(event.occurredAt),
          count: 1,
          reason: event.reason,
          error: event.error,
        });
      }
    });
  }, [clearPendingTable]);

  useEffect(() => {
    return () => {
      for (const timer of pendingTimers.current.values()) {
        clearTimeout(timer);
      }
      pendingTimers.current.clear();
    };
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        actualIsOnline,
        isSimulatedOffline,
        setSimulatedOffline,
        lastSync,
        syncIssue,
        dismissSyncIssue,
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
