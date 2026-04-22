/**
 * Factory function for creating a SyncClientEngine instance.
 *
 * @example
 * ```typescript
 * const engine = createSyncClientEngine({
 *   pg: myPglite,
 *   db: drizzle(myPglite),
 *   tenantId: 'biz-123',
 *   userId: 'user-456',
 *   authToken: 'token',
 *   apiUrl: 'https://api.example.com',
 *   httpClient: myHttpClient,
 *   entities: [...],
 * });
 * await engine.initialize();
 * await engine.start();
 * ```
 */

import { SyncClientEngine } from "./sync-client-engine";
import type { SyncClientEngineConfig } from "./types";

export function createSyncClientEngine(
  config: SyncClientEngineConfig
): SyncClientEngine {
  // Validate database source: either databaseConfig or pg+db
  if (!config.databaseConfig && !(config.pg && config.db)) {
    throw new Error(
      "SyncClientEngine config requires either 'databaseConfig' (for auto-init) " +
      "or both 'pg' and 'db' (for manual mode)."
    );
  }
  if (!config.tenantId) {
    throw new Error("SyncClientEngine config requires a 'tenantId'");
  }
  if (!config.userId) {
    throw new Error("SyncClientEngine config requires a 'userId'");
  }
  if (!config.authToken) {
    throw new Error("SyncClientEngine config requires an 'authToken'");
  }
  if (!config.apiUrl) {
    throw new Error("SyncClientEngine config requires an 'apiUrl'");
  }
  if (!config.httpClient) {
    throw new Error("SyncClientEngine config requires an 'httpClient'");
  }
  if (config.tenantColumn && !/^[a-z_][a-z0-9_]*$/.test(config.tenantColumn)) {
    throw new Error("SyncClientEngine config 'tenantColumn' must be snake_case");
  }

  return new SyncClientEngine(config);
}
