import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { DatabaseAdapter } from "../core/database-adapter";

/**
 * PGlite implementation of DatabaseAdapter.
 * Wraps a PGlite instance and its Drizzle ORM companion.
 */
export class PgLiteAdapter implements DatabaseAdapter {
  constructor(
    private readonly pg: PGlite,
    private readonly db: ReturnType<typeof drizzle>
  ) {}

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
}
