/**
 * Engine Provider
 * Integrates PGlite, PullService, and SyncService into the app
 * Uses REST-based custom sync (no Electric sync in runtime path)
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
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";

interface EngineContextValue {
  isInitialized: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  pg: PGlite | null;
  db: ReturnType<typeof drizzle> | null;
  error: Error | null;
  schemaError: Error | null;
  resetAndLogout: () => Promise<void>;
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
  const [schemaError, setSchemaError] = useState<Error | null>(null);

  const pgRef = useRef<PGlite | null>(null);
  const dbRef = useRef<ReturnType<typeof drizzle> | null>(null);
  const isInitializingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INITIALIZATION_TIMEOUT = 30000;

  // Initialize database (no Electric sync)
  useEffect(() => {
    console.log(`[ENGINE-PROVIDER] useEffect triggered`);

    let isMounted = true;

    async function initialize() {
      console.log(`[ENGINE-PROVIDER] initialize() started`);
      console.log(`[ENGINE-PROVIDER] businessId: ${businessId}`);
      console.log(`[ENGINE-PROVIDER] token present: ${!!token}`);

      try {
        setIsSyncing(true);
        setError(null);

        console.log(`[ENGINE-PROVIDER] Calling initDatabase()...`);
        const { pg, db } = await initDatabase();
        console.log(`[ENGINE-PROVIDER] initDatabase() completed`);

        // Store in refs immediately so they're available even if component re-renders
        pgRef.current = pg;
        dbRef.current = db;

        // Note: PullService and SyncService are managed by ServicesProvider
        // They will be initialized when ServicesProvider mounts with pg/db

        // Initialize devtools (engine-level helpers only, in dev mode)
        if (import.meta.env.DEV) {
          const { initDevTools } = await import("~/devtools/console");
          initDevTools({ pg, services: null });
        }

        console.log(`[ENGINE-PROVIDER] Setting isInitialized = true`);
        setIsInitialized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize engine";
        const errorObj = err instanceof Error ? err : new Error(String(err));

        console.error(`[ENGINE-PROVIDER] Initialization error:`, message);

        // Check if it's a schema error (column does not exist)
        const isSchemaError =
          message.includes("column") &&
          (message.includes("does not exist") || message.includes("no existe"));

        if (isSchemaError) {
          console.error("[ENGINE-PROVIDER] Schema mismatch detected:", message);
          setSchemaError(errorObj);
          setError(errorObj);
        } else {
          console.error("[ENGINE-PROVIDER] Initialization error:", message);
          // Allow app to load even with error
          setError(errorObj);
        }
        setIsInitialized(true);
      } finally {
        setIsSyncing(false);
      }
    }

    if (businessId && token && !isInitializingRef.current && !isInitialized) {
      console.log(`[ENGINE-PROVIDER] Triggering initialization (businessId and token present)`);
      isInitializingRef.current = true;

      timeoutRef.current = setTimeout(() => {
        if (isMounted && !isInitialized) {
          setError(new Error("Initialization timeout. Please check your connection and reload."));
          setIsSyncing(false);
          isInitializingRef.current = false;
          // Allow app to load even on timeout
          setIsInitialized(true);
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

  // Reset database and logout user
  const resetAndLogout = async () => {
    // Close database connection
    if (pgRef.current) {
      await pgRef.current.close();
      pgRef.current = null;
    }
    pgRef.current = null;
    dbRef.current = null;

    // Delete IndexedDB database
    const request = indexedDB.deleteDatabase("avileo-pg");
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear stored auth state and sync cursor
    localStorage.removeItem("bearer_token");
    localStorage.removeItem("current_business_id");
    localStorage.removeItem("avileo_pull_cursor");
    localStorage.removeItem("avileo_schema_hash");

    // Redirect to login
    window.location.href = "/login";
  };

  const value: EngineContextValue = {
    isInitialized,
    isSyncing,
    isOnline,
    pg: pgRef.current,
    db: dbRef.current,
    error,
    schemaError,
    resetAndLogout,
  };

  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
}

const defaultEngineContext: EngineContextValue = {
  isInitialized: false,
  isSyncing: false,
  isOnline: true,
  pg: null,
  db: null,
  error: null,
  schemaError: null,
  resetAndLogout: async () => {
    console.warn("[useEngine] resetAndLogout called before engine was initialized");
  },
};

export function useEngine() {
  const context = useContext(EngineContext);
  // Return safe defaults instead of throwing when context is null
  // This allows ServicesProviderWrapper to handle null pg gracefully during onboarding
  return context ?? defaultEngineContext;
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
