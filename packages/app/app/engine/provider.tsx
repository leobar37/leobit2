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

  const pgRef = useRef<PGliteWithElectric | null>(null);
  const dbRef = useRef<ReturnType<typeof drizzle> | null>(null);
  const cleanupSyncRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INITIALIZATION_TIMEOUT = 30000;

  // Initialize database and sync
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
          console.log("Product count:", result.rows[0]?.count);
          return result.rows[0]?.count;
        },
        // Check all synced tables
        checkAllTables: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const tables = ['products', 'customers', 'sales', 'abonos', 'inventory', 'suppliers', 'tags', 'product_variants', 'purchases'];
          for (const table of tables) {
            try {
              const result = await pg.query(`SELECT COUNT(*) as count FROM "${table}"`);
              console.log(`${table}: ${result.rows[0]?.count} rows`);
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
        // Check sync subscription status
        checkSyncStatus: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          try {
            const result = await pg.query(`SELECT * FROM electric.sync_status`);
            console.log("Sync status:", result.rows);
            return result.rows;
          } catch (e) {
            console.log("No sync_status table:", e);
            return null;
          }
        },
        // Get PGlite schema for products
        checkProductSchema: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          const result = await pg.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'products'
            ORDER BY ordinal_position
          `);
          console.log("Products schema:", result.rows);
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
          indexedDB.deleteDatabase("avileo-pg");
          location.reload();
        },
        checkLocalStorage: () => {
          console.log("bearer_token:", localStorage.getItem("bearer_token") ? "present" : "missing");
          console.log("current_business_id:", localStorage.getItem("current_business_id"));
          console.log("avileo_schema_version:", localStorage.getItem("avileo_schema_version"));
        },
        // Check Electric internal tables
        checkElectricTables: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          console.log("pg.electric exists:", 'electric' in pg);
          console.log("pg.sync exists:", 'sync' in pg);
          try {
            const tables = ['shape_subscriptions', 'shape_sync_status', 'sync_status'];
            for (const table of tables) {
              try {
                const result = await pg.query(`SELECT COUNT(*) as count FROM electric.${table}`);
                console.log(`electric.${table}: ${result.rows[0]?.count} rows`);
              } catch (e) {
                console.log(`electric.${table}: not found`);
              }
            }
          } catch (e) {
            console.log("Error checking electric tables:", e);
          }
          // List all schemas
          try {
            const result = await pg.query(`SELECT schema_name FROM information_schema.schemata`);
            console.log("Schemas:", result.rows.map((r: { schema_name: string }) => r.schema_name));
          } catch (e) {
            console.log("Error listing schemas:", e);
          }
        },
        // Test insert a product manually
        testInsertProduct: async () => {
          const pg = pgRef.current;
          if (!pg) return console.error("PG not initialized");
          try {
            await pg.query(`
              INSERT INTO products (id, business_id, name, type, unit, base_price, is_active, has_variants, sync_status, sync_attempts, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            `, ['test-id-123', 'a2950eca-4c3f-473b-9e9d-3cb951e4f4ad', 'Test Product', 'pollo', 'kg', '10.00', true, false, 'synced', 0]);
            console.log("Test insert successful!");
            await pg.query(`DELETE FROM products WHERE id = 'test-id-123'`);
            console.log("Test cleanup done");
          } catch (e) {
            console.error("Test insert failed:", e);
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
        cleanupSyncRef.current?.();
        cleanupSyncRef.current = null;

        console.log(`[ENGINE-PROVIDER] Calling initDatabase()...`);
        const { pg, db } = await initDatabase();
        console.log(`[ENGINE-PROVIDER] initDatabase() completed`);

        // Store in refs immediately so they're available even if component re-renders
        pgRef.current = pg as PGliteWithElectric;
        dbRef.current = db;

        // Start sync but don't let sync failures block app initialization
        console.log(`[ENGINE-PROVIDER] Starting sync...`);
        try {
          const cleanupSync = await startSync({
            pg: pg as PGliteWithElectric,
            businessId,
            token,
          });
          cleanupSyncRef.current = cleanupSync;
          console.log(`[ENGINE-PROVIDER] Sync started successfully`);
        } catch (syncError) {
          // Sync failures should not block the app from loading
          // The app will work with local data and can retry sync later
          console.warn("[ENGINE-PROVIDER] Sync failed, app will continue with local data:", syncError);
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

  // Reset database and logout user
  const resetAndLogout = async () => {
    // Close database connection
    if (pgRef.current) {
      await pgRef.current.close();
      pgRef.current = null;
    }
    pgRef.current = null;
    dbRef.current = null;
    cleanupSyncRef.current?.();
    cleanupSyncRef.current = null;

    // Delete IndexedDB database
    const request = indexedDB.deleteDatabase("avileo-pg");
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear stored auth state
    localStorage.removeItem("bearer_token");
    localStorage.removeItem("current_business_id");

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
