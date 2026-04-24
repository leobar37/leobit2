import type { SyncClientEngineContext } from "../client/types";

export interface SqlExecutor {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
}

export function createSqlExecutor(context: SyncClientEngineContext): SqlExecutor {
  return {
    query: <T>(sql: string, params?: unknown[]) => context.adapter.query<T>(sql, params),
    exec: (sql: string, params?: unknown[]) => context.adapter.exec(sql, params),
  };
}
