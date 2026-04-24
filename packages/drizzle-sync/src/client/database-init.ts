/**
 * Database Initialization
 *
 * Framework-agnostic PGlite database initialization with:
 * - Worker/direct instance creation
 * - Schema hash tracking and conditional reset
 * - Pending data preservation across schema changes
 * - SSR-safe guards
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { computeSchemaHash, saveSchemaHash } from "./schema-hash";
import {
  exportPendingData,
  importPendingData,
  type PendingDataConfig,
  type PendingTableData,
} from "./pending-data";
import type { StorageAdapter } from "./storage/storage";

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export interface DatabaseInitResult {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
}

export interface DatabaseInitConfig {
  /** IndexedDB dataDir (e.g. "idb://my-app") */
  dataDir: string;
  /** Complete schema SQL to execute */
  schemaSql: string;
  /** Drizzle schema object */
  drizzleSchema: Record<string, unknown>;
  /** Optional: PGlite WASM/data file locator */
  locateFile?: (file: string) => string;
  /** Optional: Force worker disable (default: checks env) */
  workerDisabled?: boolean;
  /** Optional: Pending data config for schema reset preservation */
  pendingDataConfig?: PendingDataConfig;
  /** Optional: Schema version key for localStorage */
  versionKey?: string;
  /** Optional: Storage implementation (default: localStorage) */
  storage?: Storage;
  /** Optional: StorageAdapter for unified key management (takes precedence over storage/versionKey) */
  storageAdapter?: StorageAdapter;
  /** Optional: Force reset flag key in storage */
  forceResetKey?: string;
  /** Optional: Callback before database reset */
  onBeforeReset?: () => Promise<void> | void;
  /** Optional: Callback after database initialized */
  onAfterInit?: (pg: PGlite, db: ReturnType<typeof drizzle>) => Promise<void> | void;
}

interface InitState {
  pg: PGlite | null;
  db: ReturnType<typeof drizzle> | null;
  promise: Promise<DatabaseInitResult> | null;
}

const state: InitState = {
  pg: null,
  db: null,
  promise: null,
};

/**
 * Create a PGlite instance (worker-first, fallback to direct)
 */
async function createPgliteInstance(
  dataDir: string,
  options?: {
    locateFile?: (file: string) => string;
    workerDisabled?: boolean;
  }
): Promise<PGlite> {
  const workerDisabled =
    options?.workerDisabled ??
    (typeof import.meta !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Boolean((import.meta as any).env?.VITE_DISABLE_PGLITE_WORKER));

  if (!workerDisabled && typeof window !== "undefined" && "Worker" in window) {
    try {
      const [{ PGliteWorker }] = await Promise.all([import("@electric-sql/pglite/worker")]);

      const worker = new Worker(
        new URL("./pglite.worker.js", import.meta.url),
        { type: "module" }
      );

      const workerInstance = await PGliteWorker.create(worker, {
        dataDir,
        relaxedDurability: true,
      });

      return workerInstance as unknown as PGlite;
    } catch (error) {
      console.warn("[DB] Worker failed, falling back to direct PGlite:", error);
    }
  }

  const [{ PGlite }] = await Promise.all([import("@electric-sql/pglite")]);

  return PGlite.create({
    dataDir,
    relaxedDurability: true,
    locateFile: options?.locateFile,
  });
}

/**
 * Reset IndexedDB database
 */
async function resetIndexedDB(dataDir: string): Promise<void> {
  const dbName = dataDir.replace("idb://", "");

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;
      setTimeout(resolve, 50);
    };

    request.onsuccess = done;
    request.onerror = () => done();
    request.onblocked = () => setTimeout(done, 200);
  });
}

/**
 * Initialize PGlite database with schema tracking
 *
 * This is the main entry point for database initialization.
 * It handles:
 * 1. Schema hash comparison
 * 2. Conditional database reset
 * 3. Pending data export/import
 * 4. Table creation
 * 5. Drizzle ORM initialization
 */
export async function initPgliteDatabase(config: DatabaseInitConfig): Promise<DatabaseInitResult> {
  if (!isBrowser) {
    throw new Error("Database cannot be initialized during SSR or build.");
  }

  if (state.pg && state.db) {
    return { pg: state.pg, db: state.db };
  }

  if (state.promise) {
    return state.promise;
  }

  state.promise = doInit(config);
  return state.promise;
}

async function doInit(config: DatabaseInitConfig): Promise<DatabaseInitResult> {
  const {
    dataDir,
    schemaSql,
    drizzleSchema,
    locateFile,
    pendingDataConfig,
    versionKey = "drizzle_sync_schema_hash",
    storage = typeof localStorage !== "undefined" ? localStorage : undefined,
    storageAdapter,
    forceResetKey = "DRIZZLE_SYNC_FORCE_RESET",
  } = config;

  // Use StorageAdapter for key resolution when available
  const getStorageValue = (kind: "schemaHash" | "forceReset"): string | null => {
    if (storageAdapter) {
      if (kind === "schemaHash") return storageAdapter.getByKind("schemaHash");
      if (kind === "forceReset") return storageAdapter.getByKind("forceReset");
    }
    // Legacy fallback
    if (kind === "schemaHash") return storage?.getItem(versionKey) ?? null;
    if (kind === "forceReset") return storage?.getItem(forceResetKey) ?? null;
    return null;
  };

  const setStorageValue = (kind: "schemaHash" | "forceReset", value: string): void => {
    if (storageAdapter) {
      if (kind === "schemaHash") { storageAdapter.setByKind("schemaHash", value); return; }
      if (kind === "forceReset") { storageAdapter.setByKind("forceReset", value); return; }
    }
    // Legacy fallback
    if (kind === "schemaHash") { storage?.setItem(versionKey, value); return; }
    if (kind === "forceReset") { storage?.setItem(forceResetKey, value); return; }
  };

  const removeStorageValue = (kind: "schemaHash" | "forceReset"): void => {
    if (storageAdapter) {
      if (kind === "schemaHash") { storageAdapter.removeByKind("schemaHash"); return; }
      if (kind === "forceReset") { storageAdapter.removeByKind("forceReset"); return; }
    }
    // Legacy fallback
    if (kind === "schemaHash") { storage?.removeItem(versionKey); return; }
    if (kind === "forceReset") { storage?.removeItem(forceResetKey); return; }
  };

  // Check for force reset
  const forceReset = getStorageValue("forceReset") === "true";
  if (forceReset) {
    removeStorageValue("forceReset");
  }

  // Compute schema hash
  const currentHash = await computeSchemaHash(schemaSql);
  const storedHash = getStorageValue("schemaHash") ?? "";
  const needsReset = forceReset || storedHash !== currentHash;

  let pendingData: PendingTableData[] | null = null;

  // Export pending data before reset
  if (needsReset && storedHash && pendingDataConfig) {
    try {
      const tempPg = await createPgliteInstance(dataDir, { locateFile });
      try {
        pendingData = await exportPendingData(tempPg, pendingDataConfig);
        console.log(
          `[DB] Exported pending data: ${pendingData.map((d) => `${d.table}(${d.rows.length})`).join(", ")}`
        );
      } finally {
        await tempPg.close();
      }
    } catch (err) {
      console.warn("[DB] Could not export pending data:", err);
    }
  }

  // Reset if needed
  if (needsReset) {
    if (config.onBeforeReset) {
      await config.onBeforeReset();
    }

    if (state.pg) {
      await state.pg.close();
      state.pg = null;
      state.db = null;
    }

    await resetIndexedDB(dataDir);
  }

  // Save hash before init to prevent infinite loops
  setStorageValue("schemaHash", currentHash);

  // Create fresh instance
  const pg = await createPgliteInstance(dataDir, { locateFile });

  // Create tables
  await pg.exec(schemaSql);

  // Import pending data
  if (pendingData && pendingData.length > 0) {
    await importPendingData(pg, pendingData);
    console.log("[DB] Pending data imported successfully");
  }

  // Initialize Drizzle
  const [{ drizzle }] = await Promise.all([import("drizzle-orm/pglite")]);
  const db = drizzle(pg, { schema: drizzleSchema });

  state.pg = pg;
  state.db = db;

  if (config.onAfterInit) {
    await config.onAfterInit(pg, db);
  }

  return { pg, db };
}

/**
 * Get initialized database (throws if not initialized)
 */
export function getDatabase(): DatabaseInitResult {
  if (!isBrowser) {
    throw new Error("Database cannot be accessed during SSR or build.");
  }
  if (!state.pg || !state.db) {
    throw new Error("Database not initialized. Call initPgliteDatabase() first.");
  }
  return { pg: state.pg, db: state.db };
}

/**
 * Dispose database and clear state
 */
export async function disposeDatabase(): Promise<void> {
  if (!isBrowser) return;
  if (state.pg) {
    try {
      await state.pg.close();
    } catch (error) {
      console.warn("[DB] Failed to close database:", error);
    }
  }
  state.pg = null;
  state.db = null;
  state.promise = null;
}

/**
 * Reset database (clears schema hash and disposes)
 */
export async function resetDatabase(options?: {
  versionKey?: string;
  storage?: Storage;
}): Promise<void> {
  if (!isBrowser) return;

  const versionKey = options?.versionKey ?? "drizzle_sync_schema_hash";
  const storage = options?.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);

  storage?.removeItem(versionKey);
  await disposeDatabase();
}
