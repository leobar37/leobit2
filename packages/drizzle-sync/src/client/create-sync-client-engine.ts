/**
 * Factory function for creating a SyncClientEngine instance.
 *
 * @example
 * ```typescript
 * const engine = createSyncClientEngine({
 *   pg: myPglite,
 *   db: drizzle(myPglite),
 *   businessId: 'biz-123',
 *   businessUserId: 'user-456',
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
  if (!config.pg) {
    throw new Error("SyncClientEngine config requires a 'pg' (PGlite) instance");
  }
  if (!config.businessId) {
    throw new Error("SyncClientEngine config requires a 'businessId'");
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

  return new SyncClientEngine(config);
}
