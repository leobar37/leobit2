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
    isUpToDate: boolean;
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
    isUpToDate: boolean;
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

/**
 * Check if error is a 409 Conflict (expired handle)
 */
function isExpiredHandleError(error: unknown): boolean {
  const errorMessage = formatSyncError(error);
  // Check for 409, expired_handle, handle conflict
  return (
    errorMessage.includes("409") ||
    errorMessage.includes("expired_handle") ||
    errorMessage.includes("handle") && errorMessage.includes("conflict") ||
    errorMessage.includes("must-refetch")
  );
}

export async function syncTable(
  pg: PGliteWithElectric,
  config: ShapeConfig,
  businessId: string,
  token: string
): Promise<SyncTableResult> {
  const url = buildShapeUrl(config.table, businessId, config.where);

  console.log(`[SYNC-DEBUG] Starting sync for table: ${config.table}`);
  console.log(`[SYNC-DEBUG] URL: ${url}`);
  console.log(`[SYNC-DEBUG] Business ID: ${businessId}`);
  console.log(`[SYNC-DEBUG] Token length: ${token.length}`);
  console.log(`[SYNC-DEBUG] Primary key: ${config.primaryKey.join(", ")}`);

  try {
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
        console.log(`[SYNC-DEBUG] onInitialSync called for ${config.table}`);
        reportShapeUpToDate(config.table);
      },
      onError: (error) => {
        const errorMessage = formatSyncError(error);
        console.error(`[SYNC-DEBUG] onError for ${config.table}:`, errorMessage);

        // Handle 409 Conflict (expired handle) - this is recoverable
        // Silent - these are expected and handled automatically
        if (isExpiredHandleError(error)) {
          console.log(`[SYNC-DEBUG] ${config.table}: expired handle error (recoverable)`);
          reportRecoverableSyncError(config.table, "expired-handle", errorMessage);
          return;
        }

        if (errorMessage.includes("duplicate key value violates unique constraint")) {
          console.log(`[SYNC-DEBUG] ${config.table}: duplicate key error (recoverable)`);
          reportRecoverableSyncError(config.table, "duplicate-key", errorMessage);
          return;
        }

        // Log unexpected errors
        console.warn(`[Sync] Error for table ${config.table}:`, errorMessage);
      },
      onMustRefetch: async (tx) => {
        console.log(`[SYNC-DEBUG] onMustRefetch called for ${config.table}`);
        reportMustRefetch(config.table);
        await tx.exec(`DELETE FROM "${config.table}"`);
      },
    });

    console.log(`[SYNC-DEBUG] syncShapeToTable returned for ${config.table}`);
    console.log(`[SYNC-DEBUG] syncResult type:`, typeof syncResult);
    console.log(`[SYNC-DEBUG] syncResult keys:`, Object.keys(syncResult || {}));

    // isUpToDate is a property (readonly boolean), not a method
    const upToDate = syncResult?.isUpToDate ?? false;
    console.log(`[SYNC-DEBUG] isUpToDate: ${upToDate}`);

    return {
      table: config.table,
      success: true,
      unsubscribe: syncResult?.unsubscribe,
    };
  } catch (error) {
    const errorMessage = formatSyncError(error);
    console.error(`[SYNC-DEBUG] CATCH block for ${config.table}:`, errorMessage);

    // Handle 409 Conflict (expired handle) - treat as recoverable
    // Silent - these are expected and handled automatically
    if (isExpiredHandleError(error)) {
      console.log(`[SYNC-DEBUG] ${config.table}: expired handle in catch (recoverable)`);
      reportRecoverableSyncError(config.table, "expired-handle", errorMessage);
      return {
        table: config.table,
        success: true,
        unsubscribe: () => {},
      };
    }

    // Ignore duplicate key errors - these are expected when data already exists
    if (errorMessage.includes("duplicate key value violates unique constraint")) {
      console.log(`[SYNC-DEBUG] ${config.table}: duplicate key in catch (recoverable)`);
      reportRecoverableSyncError(config.table, "duplicate-key", errorMessage);
      return {
        table: config.table,
        success: true,
        unsubscribe: () => {},
      };
    }

    // Log unexpected errors
    console.warn(`[Sync] Failed to sync table ${config.table}:`, errorMessage);
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
  console.log(`[SYNC-DEBUG] syncTables called with ${shapes.length} shapes`);
  console.log(`[SYNC-DEBUG] Business ID: ${businessId}`);
  console.log(`[SYNC-DEBUG] Token present: ${!!token}`);

  const results: SyncTableResult[] = [];

  // Sync tables sequentially to avoid overwhelming the server
  for (const shape of shapes) {
    console.log(`[SYNC-DEBUG] Processing shape: ${shape.table} (priority: ${shape.priority})`);

    if (shape.enabled === false) {
      console.log(`[SYNC-DEBUG] ${shape.table} is disabled, skipping`);
      results.push({
        table: shape.table,
        success: true,
        error: "Skipped (disabled)",
      });
      continue;
    }

    const result = await syncTable(pg, shape, businessId, token);
    console.log(`[SYNC-DEBUG] Result for ${shape.table}: success=${result.success}`);
    results.push(result);
  }

  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`[SYNC-DEBUG] syncTables complete: ${success.length} success, ${failed.length} failed`);
  console.log(`[SYNC-DEBUG] Failed tables:`, failed.map(r => r.table).join(", "));

  return { success, failed };
}

/**
 * Stop all sync subscriptions
 */
export function stopAllSyncs(results: SyncTableResult[]): void {
  console.log(`[SYNC-DEBUG] stopAllSyncs called for ${results.length} results`);
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
