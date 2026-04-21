/**
 * Avileo Database Initialization
 *
 * Thin wrapper around @avileo/drizzle-sync/client database init.
 * Provides Avileo-specific configuration:
 * - Schema SQL from generated DDL + sync infrastructure
 * - Pending data tables (sales, abonos, customers, etc.)
 * - localStorage keys and database naming
 */

import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { getLocalDatabaseName } from "~/lib/session-storage";
import { FULL_SCHEMA } from "~/lib/sync/schema";
import {
  initPgliteDatabase,
  getDatabase as getDbFromLib,
  disposeDatabase as disposeDbFromLib,
  resetDatabase as resetDbFromLib,
  type DatabaseInitResult,
  type PendingTableConfig,
} from "@avileo/drizzle-sync/client";

const VERSION_KEY = "avileo_schema_hash";
export const SCHEMA_HASH_KEY = VERSION_KEY;

function locatePgliteFile(file: string): string {
  if (file === "postgres.data") {
    return "/pglite.data";
  }
  if (file === "postgres.wasm") {
    return "/pglite.wasm";
  }
  return file;
}

/**
 * Avileo-specific pending data table configuration
 * Preserves unsynced sales, abonos, customers, visitas, and customer groups
 * across schema resets.
 */
const avileoPendingTables: PendingTableConfig[] = [
  { name: "customers", where: "sync_status IN ('pending', 'error')" },
  { name: "sales", where: "sync_status IN ('pending', 'error')" },
  { name: "sale_items", where: "sync_status IN ('pending', 'error')", dependsOn: ["sales"] },
  { name: "abonos", where: "sync_status IN ('pending', 'error')" },
  { name: "visitas", where: "sync_status IN ('pending', 'error')" },
  { name: "customer_groups", where: "sync_status IN ('pending', 'error')" },
  { name: "customer_group_members", where: "sync_status IN ('pending', 'error')", dependsOn: ["customer_groups"] },
];

/**
 * Initialize the Avileo local database
 */
export async function initDatabase(): Promise<DatabaseInitResult> {
  const databaseName = getLocalDatabaseName();

  return initPgliteDatabase({
    dataDir: `idb://${databaseName}`,
    schemaSql: FULL_SCHEMA,
    drizzleSchema: schema,
    locateFile: locatePgliteFile,
    versionKey: VERSION_KEY,
    forceResetKey: "AVILEO_FORCE_RESET",
    pendingDataConfig: { tables: avileoPendingTables },
    onAfterInit: (_pg, _db) => {
      console.log(`[DB] Database namespace: ${databaseName}`);
    },
  });
}

/**
 * Get initialized database instance
 */
export function getDatabase(): DatabaseInitResult {
  return getDbFromLib();
}

/**
 * Dispose database and clear state
 */
export async function disposeDatabase(): Promise<void> {
  return disposeDbFromLib();
}

/**
 * Reset database (clears schema hash and forces re-init)
 */
export async function resetDatabase(): Promise<void> {
  return resetDbFromLib({ versionKey: VERSION_KEY });
}
