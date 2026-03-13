/**
 * Engine Provider
 * Integrates PGlite, Electric sync, and SyncService into the app
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initDatabase } from "./db";
import { startSync } from "./electric";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { PGliteWithElectric } from "~/lib/sync/sync-shapes";

interface EngineContextValue {
  isInitialized: boolean;
  isSyncing: boolean;
  isOnline: boolean;
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
  const [error, setError] = useState<Error | null>(null);

  const pgRef = useRef<PGliteWithElectric | null>(null);
  const dbRef = useRef<ReturnType<typeof drizzle> | null>(null);
  const cleanupSyncRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INITIALIZATION_TIMEOUT = 30000;

  // Initialize database and sync
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setIsSyncing(true);
        setError(null);
        cleanupSyncRef.current?.();
        cleanupSyncRef.current = null;

        const { pg, db } = await initDatabase();

        // Store in refs immediately so they're available even if component re-renders
        pgRef.current = pg as PGliteWithElectric;
        dbRef.current = db;

        const cleanupSync = await startSync({
          pg: pg as PGliteWithElectric,
          businessId,
          token,
        });

        cleanupSyncRef.current = cleanupSync;
        setIsInitialized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize engine";
        setError(new Error(message));
        // Allow app to load even with error
        setIsInitialized(true);
      } finally {
        setIsSyncing(false);
      }
    }

    if (businessId && token && !isInitializingRef.current && !isInitialized) {
      isInitializingRef.current = true;

      timeoutRef.current = setTimeout(() => {
        if (isMounted && !isInitialized) {
          setError(new Error("Initialization timeout. Please check your connection and reload."));
          setIsSyncing(false);
          isInitializingRef.current = false;
        }
      }, INITIALIZATION_TIMEOUT);

      initialize().finally(() => {
        isInitializingRef.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });
    }

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      cleanupSyncRef.current?.();
      cleanupSyncRef.current = null;
      pgRef.current = null;
      dbRef.current = null;
    };
  }, [businessId, token]);

  // Setup network listeners
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

  const value: EngineContextValue = {
    isInitialized,
    isSyncing,
    isOnline,
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
  const { isSyncing, isOnline } = useEngine();
  return { isSyncing, isOnline };
}
