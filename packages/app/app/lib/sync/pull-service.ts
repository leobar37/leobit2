/**
 * Pull Service
 * Fetches changes from the server using /sync/changes endpoint
 * Updates local PGlite database and invalidates TanStack Query when new data arrives
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { PULL_INTERVAL_MS } from "./config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

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
}

export interface PullResult {
  success: boolean;
  changesApplied: number;
  error?: string;
}

/**
 * Apply a single change to the local PGlite database
 */
async function applyChange(
  pg: PGlite,
  db: ReturnType<typeof drizzle>,
  change: PullChange
): Promise<void> {
  const tableName = change.entityType;

  switch (change.operation) {
    case "insert":
    case "create": {
      // Convert payload to snake_case for database
      const data = toSnakeCase(change.payload);

      // Add business_id if not present (we'll handle this in the query)
      const columns = Object.keys(data).join(", ");
      const values = Object.values(data)
        .map((v) => (v === null ? "NULL" : typeof v === "string" ? `'${escapeSqlString(String(v))}'` : String(v)))
        .join(", ");

      // Check if record already exists
      const existing = await pg.query<{ id: string }>(
        `SELECT id FROM "${tableName}" WHERE id = $1`,
        [change.entityId]
      );

      if (existing.rows.length === 0) {
        await pg.exec(
          `INSERT INTO "${tableName}" (${columns}) VALUES (${values})`
        );
      }
      break;
    }

    case "update": {
      const data = toSnakeCase(change.payload);
      const setClauses = Object.entries(data)
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          return `${key} = ${typeof value === "string" ? `'${escapeSqlString(String(value))}'` : String(value)}`;
        })
        .join(", ");

      await pg.exec(
        `UPDATE "${tableName}" SET ${setClauses} WHERE id = '${escapeSqlString(change.entityId)}'`
      );
      break;
    }

    case "delete":
      await pg.exec(`DELETE FROM "${tableName}" WHERE id = '${escapeSqlString(change.entityId)}'`);
      break;
  }
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

export class PullService {
  private pg: PGlite;
  private db: ReturnType<typeof drizzle>;
  private businessId: string;
  private authToken: string;
  private pullIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastSince: string | null = null;
  private onChangesApplied: ((entityTypes: string[]) => void) | null = null;

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
  }

  /**
   * Set callback for when changes are applied
   */
  setOnChangesApplied(callback: (entityTypes: string[]) => void): void {
    this.onChangesApplied = callback;
  }

  /**
   * Fetch changes from the server
   */
  async pull(): Promise<PullResult> {
    try {
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
        return {
          success: false,
          changesApplied: 0,
          error: `Pull failed: ${response.status} ${errorText}`,
        };
      }

      const body = (await response.json()) as { success: boolean; data: PullResponse };

      if (!body.success || !body.data?.changes) {
        return {
          success: false,
          changesApplied: 0,
          error: "Invalid response format",
        };
      }

      const { changes, nextSince } = body.data;

      if (changes.length === 0) {
        return { success: true, changesApplied: 0 };
      }

      // Apply each change to local database
      const entityTypes = new Set<string>();

      for (const change of changes) {
        try {
          await applyChange(this.pg, this.db, change);
          entityTypes.add(change.entityType);
        } catch (error) {
          console.error(`[Pull] Failed to apply change for ${change.entityType}:`, error);
        }
      }

      // Update lastSince to track position
      if (nextSince) {
        this.lastSince = nextSince;
      }

      // Notify about changes
      if (entityTypes.size > 0 && this.onChangesApplied) {
        this.onChangesApplied(Array.from(entityTypes));
      }

      return {
        success: true,
        changesApplied: changes.length,
      };
    } catch (error) {
      return {
        success: false,
        changesApplied: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start periodic pull
   */
  startAutoPull(): void {
    if (this.pullIntervalId) {
      return;
    }

    this.pullIntervalId = setInterval(async () => {
      if (navigator.onLine) {
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
