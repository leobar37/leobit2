/**
 * Engine Provider
 * Integrates PGlite, Electric sync, and WriteEngine into the app
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initDatabase, getDatabase } from "./db";
import { startSync, stopSync } from "./electric";
import { setupNetworkListeners, getQueueStatus } from "./write-engine";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";

interface EngineContextValue {
  isInitialized: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  queueStatus: { pending: number; failed: number };
  pg: PGlite | null;
  db: ReturnType<typeof drizzle> | null;
  error: Error | null;
}

const EngineContext = createContext<EngineContextValue | null>(null);

interface EngineProviderProps {
  children: ReactNode;
  businessId: string;
  token: string;
}

export function EngineProvider({
  children,
  businessId,
  token,
}: EngineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueStatus, setQueueStatus] = useState({ pending: 0, failed: 0 });
  const [error, setError] = useState<Error | null>(null);

  const pgRef = useRef<PGlite | null>(null);
  const dbRef = useRef<ReturnType<typeof drizzle> | null>(null);
  const cleanupSyncRef = useRef<(() => void) | null>(null);
  const cleanupNetworkRef = useRef<(() => void) | null>(null);

  // Initialize database and sync
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setIsSyncing(true);

        // Initialize PGlite
        const { pg, db } = await initDatabase();

        if (!isMounted) return;

        pgRef.current = pg;
        dbRef.current = db;
        setIsInitialized(true);

        // Start Electric sync
        const cleanupSync = await startSync({ pg, businessId, token });
        cleanupSyncRef.current = cleanupSync;

        // Setup network listeners
        const cleanupNetwork = setupNetworkListeners(
          () => {
            setIsOnline(true);
            // Queue will be processed automatically by the listener
          },
          () => setIsOnline(false)
        );
        cleanupNetworkRef.current = cleanupNetwork;

        // Initial queue status
        const status = await getQueueStatus();
        setQueueStatus(status);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err : new Error("Failed to initialize engine")
        );
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    if (businessId && token) {
      initialize();
    }

    return () => {
      isMounted = false;
      cleanupSyncRef.current?.();
      cleanupNetworkRef.current?.();
    };
  }, [businessId, token]);

  // Poll queue status periodically
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      const status = await getQueueStatus();
      setQueueStatus(status);
    }, 5000);

    return () => clearInterval(interval);
  }, [isInitialized]);

  const value: EngineContextValue = {
    isInitialized,
    isSyncing,
    isOnline,
    queueStatus,
    pg: pgRef.current,
    db: dbRef.current,
    error,
  };

  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
}

export function useEngine() {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error("useEngine must be used within an EngineProvider");
  }
  return context;
}

/**
 * Hook to check if engine is ready
 */
export function useEngineReady() {
  const { isInitialized, error } = useEngine();
  return { isReady: isInitialized, error };
}

/**
 * Hook to get sync status
 */
export function useSyncStatus() {
  const { isSyncing, isOnline, queueStatus } = useEngine();
  return { isSyncing, isOnline, queueStatus };
}
