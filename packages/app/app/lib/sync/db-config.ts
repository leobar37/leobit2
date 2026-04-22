/**
 * Avileo Database Configuration
 *
 * Specific database initialization config for the Avileo app.
 * This replaces the old app/engine/db.ts wrapper.
 */

import * as schema from "@avileo/shared";
import { getLocalDatabaseName } from "~/lib/session-storage";
import { FULL_SCHEMA } from "~/lib/sync/schema";
import type { DatabaseInitConfig, PendingTableConfig } from "@avileo/drizzle-sync/client";

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

const avileoPendingTables: PendingTableConfig[] = [
  { name: "customers", where: "sync_status IN ('pending', 'error')" },
  { name: "sales", where: "sync_status IN ('pending', 'error')" },
  { name: "sale_items", where: "sync_status IN ('pending', 'error')", dependsOn: ["sales"] },
  { name: "abonos", where: "sync_status IN ('pending', 'error')" },
  { name: "visitas", where: "sync_status IN ('pending', 'error')" },
  { name: "customer_groups", where: "sync_status IN ('pending', 'error')" },
  { name: "customer_group_members", where: "sync_status IN ('pending', 'error')", dependsOn: ["customer_groups"] },
];

export function createAvileoDatabaseConfig(): DatabaseInitConfig {
  const databaseName = getLocalDatabaseName();

  return {
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
  };
}
