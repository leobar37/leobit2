/**
 * SqlExecutor
 * Abstraction for executing SQL queries, enabling dependency injection and test mocking.
 * Wraps PGlite to provide a clean interface for domain services.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { SyncClientEngineContext } from "../client/types";

/**
 * Interface for executing SQL queries.
 * Provides a minimal abstraction over PGlite for testing and flexibility.
 */
export interface SqlExecutor {
  /**
   * Execute a SELECT query and return rows.
   */
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   */
  exec(sql: string, params?: unknown[]): Promise<void>;
}

/**
 * PGlite implementation of SqlExecutor.
 */
export class PgLiteSqlExecutor implements SqlExecutor {
  constructor(private pg: PGlite) {}

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
}

/**
 * Factory function to create a SqlExecutor from engine context.
 */
export function createSqlExecutor(context: SyncClientEngineContext): SqlExecutor {
  return new PgLiteSqlExecutor(context.pg);
}
