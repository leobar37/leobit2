/**
 * Pull Service
 * Fetches changes from the server using /sync/changes endpoint
 * Updates local PGlite database and invalidates TanStack Query when new data arrives
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { PULL_INTERVAL_MS, BACKOFF_BASE_MS, BACKOFF_MAX_MS } from "./config";
import { getLocalDatabaseNamespace, getPullCursorStorageKey } from "~/lib/session-storage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

// Maximum number of retries for applying a single change
const MAX_APPLY_RETRIES = 3;

// Valid table names that can be synced (whitelist for safety)
const VALID_TABLES = new Set([
  "customers",
  "products",
  "product_variants",
  "sales",
  "sale_items",
  "abonos",
  "purchases",
  "purchase_items",
  "suppliers",
  "inventory",
  "variant_inventory",
  "distribuciones",
  "distribucion_items",
  "closings",
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
]);

export interface PullChange {
  idempotencyKey: string;
  entityType: string;
  operation: "insert" | "update" | "delete" | "create";
  entityId: string;
  payload: Record<string, unknown>;
  localTimestamp: string;
  processedAt: string;
}

export interface PullResponse {
  changes: PullChange[];
  nextSince: string;
  hasMore: boolean;
  serverTimestamp?: string;
}

export interface PullResult {
  success: boolean;
  changesApplied: number;
  hasMore: boolean;
  error?: string;
}

export interface PullStatus {
  isPulling: boolean;
  lastPullTime: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  cursor: string | null;
}

/**
 * Validate that a table name is safe to use in SQL
 */
function isValidTableName(tableName: string): boolean {
  return VALID_TABLES.has(tableName);
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Convert camelCase keys to snake_case
 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Format a value for SQL insertion
 */
function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return `'${escapeSqlString(value)}'`;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (typeof value === "object") {
    return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`;
  }
  return String(value);
}

/**
 * Apply a single change to the local PGlite database with retry logic
 */
async function applyChange(
  pg: PGlite,
  change: PullChange,
  businessId: string,
  retriesLeft: number = MAX_APPLY_RETRIES
): Promise<{ success: boolean; error?: string }> {
  const tableName = change.entityType;

  // Validate table name for SQL injection safety
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    switch (change.operation) {
      case "insert":
      case "create": {
        const data = toSnakeCase(change.payload);
        
        // Inject required fields if missing from payload
        // id: always use entityId from the change record
        if (!data.id) {
          data.id = change.entityId;
        }
        // business_id: inject from context if missing (required for multi-tenancy)
        if (!data.business_id) {
          data.business_id = businessId;
        }
        
        if (Object.keys(data).length === 0) {
          return { success: false, error: "Empty payload for insert operation" };
        }

        const columns = Object.keys(data);
        const values = Object.values(data).map(formatSqlValue);

        // Use parameterized query for id check
        const existing = await pg.query<{ id: string }>(
          `SELECT id FROM "${tableName}" WHERE id = $1`,
          [change.entityId]
        );

        if (existing.rows.length === 0) {
          await pg.exec(
            `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES (${values.join(", ")})`
          );
        } else {
          // Record exists, do an upsert instead
          const setClauses = columns
            .filter((col) => col !== "id")
            .map((col) => `${col} = EXCLUDED.${col}`)
            .join(", ");
          
          if (setClauses) {
            await pg.exec(
              `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${setClauses}`
            );
          }
        }
        break;
      }

      case "update": {
        const data = toSnakeCase(change.payload);
        
        if (Object.keys(data).length === 0) {
          return { success: false, error: "Empty payload for update operation" };
        }

        // Ensure id and business_id are set before building the query
        if (!data.id) {
          data.id = change.entityId;
        }
        if (!data.business_id) {
          data.business_id = businessId;
        }

        const columns = Object.keys(data);
        const values = Object.values(data).map(formatSqlValue);

        // Always use UPSERT: insert if not exists, update if exists
        // This handles the case where local DB was cleared but server has the record
        const setClauses = columns
          .filter((col) => col !== "id")
          .map((col) => `${col} = EXCLUDED.${col}`)
          .join(", ");

        await pg.exec(
          `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${setClauses}`
        );
        break;
      }

      case "delete": {
        await pg.query(`DELETE FROM "${tableName}" WHERE id = $1`, [change.entityId]);
        break;
      }

      default:
        return { success: false, error: `Unknown operation: ${change.operation}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Retry on transient errors
    if (retriesLeft > 0 && isTransientError(errorMessage)) {
      console.warn(`[Pull] Retrying change for ${tableName}:${change.entityId} (${retriesLeft} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return applyChange(pg, change, businessId, retriesLeft - 1);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Check if an error is transient and worth retrying
 */
function isTransientError(errorMessage: string): boolean {
  const transientPatterns = [
    "database is locked",
    "SQLITE_BUSY",
    "connection",
    "timeout",
    "deadlock",
  ];
  return transientPatterns.some((pattern) => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

export class PullService {
  private pg: PGlite;
  private db: ReturnType<typeof drizzle>;
  private businessId: string;
  private authToken: string;
  private pullIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastSince: string | null = null;
  private onChangesApplied: ((entityTypes: string[]) => void) | null = null;
  
  // Retry backoff state
  private consecutiveFailures: number = 0;
  private currentBackoff: number = 0;
  
  // Status tracking
  private isPullingFlag: boolean = false;
  private lastPullTime: Date | null = null;
  private lastError: string | null = null;
  private cursorStorageKey: string;

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    businessId: string,
    authToken: string
  ) {
    this.pg = pg;
    this.db = db;
    this.businessId = businessId;
    this.authToken = authToken;
    this.cursorStorageKey = getPullCursorStorageKey(getLocalDatabaseNamespace());
    
    // Load persisted cursor from localStorage
    this.loadCursor();
  }

  /**
   * Load cursor from localStorage
   */
  private loadCursor(): void {
    try {
      const stored = localStorage.getItem(this.cursorStorageKey);
      if (stored) {
        this.lastSince = stored;
        console.log(`[PullService] Loaded cursor from storage:`, this.lastSince);
      }
    } catch (e) {
      console.warn(`[PullService] Failed to load cursor from localStorage:`, e);
    }
  }

  /**
   * Save cursor to localStorage
   */
  private saveCursor(cursor: string): void {
    try {
      localStorage.setItem(this.cursorStorageKey, cursor);
      this.lastSince = cursor;
    } catch (e) {
      console.warn(`[PullService] Failed to save cursor to localStorage:`, e);
    }
  }

  /**
   * Clear cursor from localStorage
   */
  clearCursor(): void {
    try {
      localStorage.removeItem(this.cursorStorageKey);
      this.lastSince = null;
    } catch (e) {
      console.warn(`[PullService] Failed to clear cursor:`, e);
    }
  }

  /**
   * Set callback for when changes are applied
   */
  setOnChangesApplied(callback: (entityTypes: string[]) => void): void {
    this.onChangesApplied = callback;
  }

  /**
   * Get current pull status
   */
  getStatus(): PullStatus {
    return {
      isPulling: this.isPullingFlag,
      lastPullTime: this.lastPullTime,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      cursor: this.lastSince,
    };
  }

  /**
   * Calculate backoff delay based on consecutive failures
   */
  private getBackoffDelay(): number {
    if (this.consecutiveFailures === 0) return 0;
    
    // Exponential backoff: base * 2^(failures-1), capped at max
    const delay = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, this.consecutiveFailures - 1),
      BACKOFF_MAX_MS
    );
    return delay;
  }

  /**
   * Fetch changes from the server with pagination support
   */
  async pull(): Promise<PullResult> {
    // Prevent concurrent pulls
    if (this.isPullingFlag) {
      return { success: false, changesApplied: 0, hasMore: false, error: "Pull already in progress" };
    }

    this.isPullingFlag = true;

    try {
      // Apply backoff if we have consecutive failures
      if (this.currentBackoff > 0) {
        console.log(`[PullService] Waiting ${this.currentBackoff}ms due to previous failures`);
        await new Promise((resolve) => setTimeout(resolve, this.currentBackoff));
      }

      const url = new URL(`${API_URL}/sync/changes`);
      if (this.lastSince) {
        url.searchParams.set("since", this.lastSince);
      }
      url.searchParams.set("limit", "100");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "x-business-id": this.businessId,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Increment failure count for backoff
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = `Pull failed: ${response.status} ${errorText}`;
        
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: this.lastError,
        };
      }

      const body = (await response.json()) as { 
        success: boolean; 
        data: PullResponse;
        hasMore?: boolean;
      };

      if (!body.success || !body.data?.changes) {
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = "Invalid response format";
        
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: this.lastError,
        };
      }

      // Reset failure count on success
      this.consecutiveFailures = 0;
      this.currentBackoff = 0;
      this.lastError = null;

      const { changes, nextSince, hasMore = false, serverTimestamp } = body.data;

      // Update last pull time
      this.lastPullTime = serverTimestamp ? new Date(serverTimestamp) : new Date();

      if (changes.length === 0) {
        return { success: true, changesApplied: 0, hasMore: false };
      }

      // Apply each change to local database
      const entityTypes = new Set<string>();
      let appliedCount = 0;
      const failedChanges: Array<{ change: PullChange; error: string }> = [];

      for (const change of changes) {
        const result = await applyChange(this.pg, change, this.businessId);
        
        if (result.success) {
          entityTypes.add(change.entityType);
          appliedCount++;
        } else {
          console.error(`[Pull] Failed to apply change for ${change.entityType}:${change.entityId}:`, result.error);
          failedChanges.push({ change, error: result.error || "Unknown error" });
        }
      }

      // Persist cursor to localStorage only if we applied at least one change
      if (nextSince && appliedCount > 0) {
        this.saveCursor(nextSince);
      }

      // Notify about changes
      if (entityTypes.size > 0 && this.onChangesApplied) {
        this.onChangesApplied(Array.from(entityTypes));
      }

      // Log summary if there were failures
      if (failedChanges.length > 0) {
        console.warn(`[Pull] Applied ${appliedCount}/${changes.length} changes. ${failedChanges.length} failed.`);
      }

      return {
        success: true,
        changesApplied: appliedCount,
        hasMore,
      };
    } catch (error) {
      // Increment failure count for backoff
      this.consecutiveFailures++;
      this.currentBackoff = this.getBackoffDelay();
      this.lastError = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: this.lastError,
      };
    } finally {
      this.isPullingFlag = false;
    }
  }

  /**
   * Pull all changes until no more available
   */
  async pullAll(): Promise<{ totalApplied: number; errors: string[] }> {
    let totalApplied = 0;
    const errors: string[] = [];

    while (true) {
      const result = await this.pull();
      
      if (!result.success) {
        if (result.error) {
          errors.push(result.error);
        }
        break;
      }

      totalApplied += result.changesApplied;

      if (!result.hasMore) {
        break;
      }
    }

    return { totalApplied, errors };
  }

  /**
   * Start periodic pull
   */
  startAutoPull(): void {
    if (this.pullIntervalId) {
      return;
    }

    this.pullIntervalId = setInterval(async () => {
      if (navigator.onLine && !this.isPullingFlag) {
        await this.pull();
      }
    }, PULL_INTERVAL_MS);

    // Also do an immediate pull when starting
    this.pull();
  }

  /**
   * Stop periodic pull
   */
  stopAutoPull(): void {
    if (this.pullIntervalId) {
      clearInterval(this.pullIntervalId);
      this.pullIntervalId = null;
    }
  }

  /**
   * Force a pull and wait for it to complete
   */
  async forcePullNow(): Promise<PullResult> {
    return this.pull();
  }

  /**
   * Get last sync timestamp
   */
  getLastSince(): string | null {
    return this.lastSince;
  }
}
