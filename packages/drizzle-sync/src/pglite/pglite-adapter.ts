import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { DatabaseAdapter } from "../core/database-adapter";
import type { DatabaseInitConfig } from "../client/database-init";

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

/**
 * PGlite implementation of DatabaseAdapter.
 * Wraps a PGlite instance and its Drizzle ORM companion.
 *
 * Use the static {@link create} and {@link fromInstance} factories for initialization.
 */
export class PgLiteAdapter implements DatabaseAdapter {
  constructor(
    private readonly pg: PGlite,
    private readonly db: ReturnType<typeof drizzle>
  ) {}

  /** Create a PgLiteAdapter from an existing PGlite instance */
  static fromInstance(context: {
    pg: PGlite;
    db: ReturnType<typeof drizzle>;
  }): PgLiteAdapter {
    return new PgLiteAdapter(context.pg, context.db);
  }

  /** Create a PgLiteAdapter by initializing a new PGlite database */
  static async create(config: DatabaseInitConfig): Promise<PgLiteAdapter> {
    const { initPgliteDatabase } = await import("../client/database-init");
    const result = await initPgliteDatabase(config);
    return new PgLiteAdapter(result.pg, result.db);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    return this.pg.query<T>(sql, params);
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    if (params) {
      await this.pg.query(sql, params);
    } else {
      await this.pg.exec(sql);
    }
  }

  getDb(): ReturnType<typeof drizzle> {
    return this.db;
  }

  /** Return the raw PGlite + Drizzle instance pair */
  getInstance(): { pg: PGlite; db: ReturnType<typeof drizzle> } {
    return { pg: this.pg, db: this.db };
  }

  /** Close the underlying PGlite instance */
  async dispose(): Promise<void> {
    if (!isBrowser) return;
    try {
      await this.pg.close();
    } catch (error) {
      console.warn("[DB] Failed to close database:", error);
    }
  }
}
