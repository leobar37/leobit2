/**
 * DatabaseAdapter
 * Abstraction for SQL execution and Drizzle ORM access.
 * Enables the sync engine to work with multiple database backends
 * (PGlite, SQLite, PostgreSQL, etc.).
 */
export interface DatabaseAdapter {
  /**
   * Execute a SELECT query and return rows.
   * Must return an object with a `rows` array.
   */
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   */
  exec(sql: string, params?: unknown[]): Promise<void>;

  /**
   * Get the Drizzle ORM instance associated with this adapter.
   * The return type is intentionally generic — consumers should use
   * their schema-specific Drizzle instance type.
   */
  getDb(): unknown;
}
