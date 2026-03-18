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

    // Add window-level debug helper
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).avileoDebug = {
        getProducts: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const result = await pg.query(`SELECT * FROM products`);
          console.log("Products in local DB:", result.rows);
          return result.rows;
        },
        getProductCount: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const result = await pg.query(`SELECT COUNT(*) as count FROM products`);
          const row = result.rows[0] as { count: string | number } | undefined;
          console.log("Product count:", row?.count);
          return row?.count;
        },
        // Check all synced tables
        checkAllTables: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const tables = ['products', 'customers', 'sales', 'abonos', 'inventory', 'suppliers', 'tags', 'product_variants', 'purchases'];
          for (const table of tables) {
            try {
              const result = await pg.query(`SELECT COUNT(*) as count FROM "${table}"`);
              const row = result.rows[0] as { count: string | number } | undefined;
              console.log(`${table}: ${row?.count} rows`);
            } catch (e) {
              console.log(`${table}: ERROR - ${e}`);
            }
          }
        },
        // Query products with business_id filter (like the app does)
        getProductsForBusiness: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const businessId = localStorage.getItem("current_business_id");
          console.log("Querying for businessId:", businessId);
          const result = await pg.query(`SELECT * FROM products WHERE business_id = $1`, [businessId]);
          console.log("Products for business:", result.rows);
          return result.rows;
        },
        // Raw query
        query: async (sql: string, params?: unknown[]) => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const result = await pg.query(sql, params);
          console.log("Query result:", result.rows);
          return result.rows;
        },
        forceResync: () => {
          localStorage.removeItem("avileo_schema_version");
          localStorage.removeItem("avileo_pull_cursor");
          indexedDB.deleteDatabase("avileo-pg");
          location.reload();
        },
        checkLocalStorage: () => {
          console.log("bearer_token:", localStorage.getItem("bearer_token") ? "present" : "missing");
          console.log("current_business_id:", localStorage.getItem("current_business_id"));
          console.log("avileo_schema_version:", localStorage.getItem("avileo_schema_version"));
          console.log("avileo_pull_cursor:", localStorage.getItem("avileo_pull_cursor"));
        },
        // Generate and copy diagnostic report to clipboard
        copyDiagnosticReport: async () => {
          const pg = pgRef.current;
          
          interface DiagnosticReport {
            timestamp: string;
            localStorage: {
              bearer_token: string;
              current_business_id: string | null;
              avileo_schema_version: string | null;
              avileo_pull_cursor: string | null;
            };
            pgInitialized: boolean;
            tables: Record<string, number>;
            pullCursor: string | null;
            errors: string[];
          }
          const report: DiagnosticReport = {
            timestamp: new Date().toISOString(),
            localStorage: {
              bearer_token: localStorage.getItem("bearer_token") ? "present" : "missing",
              current_business_id: localStorage.getItem("current_business_id"),
              avileo_schema_version: localStorage.getItem("avileo_schema_version"),
              avileo_pull_cursor: localStorage.getItem("avileo_pull_cursor"),
            },
            pgInitialized: !!pg,
            tables: {},
            pullCursor: localStorage.getItem("avileo_pull_cursor"),
            errors: [],
          };

          if (!pg) {
            report.errors.push("PGlite not initialized");
          } else {
            // Check all main tables
            const tables = [
              'products', 'customers', 'sales', 'abonos', 'inventory',
              'suppliers', 'tags', 'product_variants', 'purchases',
              'sale_items', 'purchase_items', 'distribuciones',
              'distribucion_items', 'closings', 'variant_inventory', 'customer_tags',
              'customer_groups', 'customer_group_members', 'visitas', 'sync_operations'
            ];
            for (const table of tables) {
              try {
                const result = await pg.query(`SELECT COUNT(*) as count FROM "${table}"`);
                const count = result.rows[0] as { count: string | number } | undefined;
                report.tables[table] = Number(count?.count || 0);
              } catch (e) {
                report.tables[table] = -1;
                report.errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          }

          const jsonReport = JSON.stringify(report, null, 2);
          
          try {
            await navigator.clipboard.writeText(jsonReport);
            console.log("✅ Diagnostic report copied to clipboard!");
            console.log("Report preview:", report);
            return report;
          } catch (e) {
            console.error("Failed to copy to clipboard:", e);
            console.log("Report (copy manually):", jsonReport);
            return report;
          }
        },
      };
      console.log("[ENGINE-PROVIDER] Debug helper available at window.avileoDebug");
    }

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

export function useEngine() {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error(
      "useEngine must be used within an EngineProvider. " +
      "Make sure ProtectedLayout is rendering EngineProvider correctly."
    );
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
