/**
 * Schema Versioning for Sync System
 * 
 * Manages schema migrations for the local PGlite database.
 * Ensures the sync system can evolve without breaking existing data.
 */

import type { PGlite } from "@electric-sql/pglite";

export const SYNC_SCHEMA_VERSION = 1;

export interface SchemaVersionRecord {
  version: number;
  migratedAt: string;
}

/**
 * Check current schema version and run migrations if needed
 */
export async function checkAndMigrateSchema(pg: PGlite): Promise<void> {
  // Ensure schema_version table exists
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sync_schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 1,
      migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get current version
  const result = await pg.query<{ version: number }>(
    `SELECT version FROM sync_schema_version WHERE id = 1`
  );

  const currentVersion = result.rows[0]?.version ?? 0;

  if (currentVersion < SYNC_SCHEMA_VERSION) {
    console.log(`[SchemaVersion] Migrating from ${currentVersion} to ${SYNC_SCHEMA_VERSION}`);
    await runMigrations(pg, currentVersion, SYNC_SCHEMA_VERSION);
  }
}

/**
 * Run migrations from current version to target version
 */
async function runMigrations(
  pg: PGlite,
  fromVersion: number,
  toVersion: number
): Promise<void> {
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    console.log(`[SchemaVersion] Running migration ${version}`);
    
    switch (version) {
      case 1:
        // Initial schema - sync_operations and sync_dead_letter tables
        // These are created by SyncService.initTables()
        break;
      
      // Future migrations go here:
      // case 2:
      //   await pg.exec(`ALTER TABLE sync_operations ADD COLUMN ...`);
      //   break;
    }

    // Update version record
    await pg.query(
      `INSERT INTO sync_schema_version (id, version, migrated_at) 
       VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
         version = EXCLUDED.version,
         migrated_at = EXCLUDED.migrated_at`,
      [version]
    );
  }
}

/**
 * Get current schema version
 */
export async function getSchemaVersion(pg: PGlite): Promise<number> {
  try {
    const result = await pg.query<{ version: number }>(
      `SELECT version FROM sync_schema_version WHERE id = 1`
    );
    return result.rows[0]?.version ?? 0;
  } catch {
    return 0;
  }
}
