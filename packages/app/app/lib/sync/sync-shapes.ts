import type { PGlite } from "@electric-sql/pglite";
import type { ShapeConfig } from "./shape-config";
import {
  reportMustRefetch,
  reportRecoverableSyncError,
  reportShapeUpToDate,
} from "~/lib/db/electric-sync-events";

// Type for PGlite with electric extension
export type { PGliteWithElectric };

type ElectricNamespace = {
  syncShapeToTable: (options: {
    shape: {
      url: string;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    };
    table: string;
    primaryKey: string[];
    shapeKey?: string;
    onError?: (error: Error) => void;
    onInitialSync?: () => void;
    onMustRefetch?: (tx: PGlite) => Promise<void>;
  }) => Promise<{
    unsubscribe: () => void;
    isUpToDate: () => boolean;
  }>;
  syncShapesToTables: (options: {
    key: string;
    shapes: Record<string, {
      shape: {
        url: string;
        params?: Record<string, string>;
        headers?: Record<string, string>;
      };
      table: string;
      primaryKey: string[];
    }>;
    onInitialSync?: () => void;
    onError?: (error: Error) => void;
  }) => Promise<{
    unsubscribe: () => void;
    isUpToDate: () => boolean;
  }>;
};

type PGliteWithElectric = PGlite & {
  electric: ElectricNamespace;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

export interface SyncTableResult {
  table: string;
  success: boolean;
  error?: string;
  unsubscribe?: () => void;
}

export interface SyncTablesResult {
  success: SyncTableResult[];
  failed: SyncTableResult[];
}

export interface SyncStatus {
  table: string;
  isReady: boolean;
  isUpToDate: boolean;
  error?: string;
}

/**
 * Build the ElectricSQL shape URL with parameters
 */
function buildShapeUrl(
  table: string,
  businessId: string,
  where?: string
): string {
  const url = new URL(`${API_URL}/electric`);
  url.searchParams.set("table", table);

  // Add business_id filter to where clause
  const businessFilter = where?.replace("{businessId}", businessId);
  if (businessFilter) {
    url.searchParams.set("where", businessFilter);
  }

  return url.toString();
}

function buildShapeKey(table: string, businessId: string): string {
  return `${table}-${businessId}`;
}

function formatSyncError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (obj.message) return String(obj.message);
    if (obj.error) return String(obj.error);
    return JSON.stringify(error);
  }
  return String(error);
}

export async function syncTable(
  pg: PGliteWithElectric,
  config: ShapeConfig,
  businessId: string,
  token: string
): Promise<SyncTableResult> {
  try {
    const url = buildShapeUrl(config.table, businessId, config.where);

    const syncResult = await pg.electric.syncShapeToTable({
      shape: {
        url,
        params: {
          table: config.table,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "x-business-id": businessId,
        },
      },
      table: config.table,
      primaryKey: config.primaryKey,
      shapeKey: buildShapeKey(config.table, businessId),
      onInitialSync: () => {
        reportShapeUpToDate(config.table);
      },
      onError: (error) => {
        const errorMessage = formatSyncError(error);

        if (errorMessage.includes("duplicate key value violates unique constraint")) {
          reportRecoverableSyncError(config.table, "duplicate-key", errorMessage);
          return;
        }
      },
      onMustRefetch: async (tx) => {
        reportMustRefetch(config.table);
        await tx.exec(`DELETE FROM "${config.table}"`);
      },
    });

    return {
      table: config.table,
      success: true,
      unsubscribe: syncResult.unsubscribe,
    };
  } catch (error) {
    const errorMessage = formatSyncError(error);

    // Ignore duplicate key errors - these are expected when data already exists
    if (errorMessage.includes("duplicate key value violates unique constraint")) {
      reportRecoverableSyncError(config.table, "duplicate-key", errorMessage);
      return {
        table: config.table,
        success: true,
        unsubscribe: () => {},
      };
    }

    return {
      table: config.table,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sync multiple tables using ElectricSQL
 * Handles errors per table - doesn't fail all if one fails
 */
export async function syncTables(
  pg: PGliteWithElectric,
  businessId: string,
  token: string,
  shapes: ShapeConfig[]
): Promise<SyncTablesResult> {
  const results: SyncTableResult[] = [];

  // Sync tables sequentially to avoid overwhelming the server
  for (const shape of shapes) {
    if (shape.enabled === false) {
      results.push({
        table: shape.table,
        success: true,
        error: "Skipped (disabled)",
      });
      continue;
    }

    const result = await syncTable(pg, shape, businessId, token);
    results.push(result);
  }

  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return { success, failed };
}

/**
 * Stop all sync subscriptions
 */
export function stopAllSyncs(results: SyncTableResult[]): void {
  for (const result of results) {
    if (result.unsubscribe) {
      try {
        result.unsubscribe();
      } catch {
        // Ignore errors when stopping sync
      }
    }
  }
}

/**
 * Check if a table is up to date (synced)
 */
export async function isTableUpToDate(
  pg: PGliteWithElectric,
  table: string
): Promise<boolean> {
  try {
    // Query Electric's internal metadata to check sync status
    const result = await pg.query<{ is_up_to_date: boolean }>(`
      SELECT is_up_to_date FROM electric.${table}_shape_status LIMIT 1
    `);

    return result.rows[0]?.is_up_to_date ?? false;
  } catch {
    // Table might not exist or sync not started
    return false;
  }
}
