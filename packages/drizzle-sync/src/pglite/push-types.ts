/**
 * Push Service Types
 */

import type { ISyncQueue, ISyncHttpClient, ISyncLogger, SyncOperationRecord } from "../core";
import type { ISyncMutex } from "./sync-mutex";
import type { SyncClientEngineContext } from "../client/types";
import type { SyncAutoRunner } from "./auto-runner";
import type { SyncOperationLifecycleService } from "./operation-lifecycle";

export interface PushServiceOptions {
  httpClient: ISyncHttpClient;
  queue?: ISyncQueue;
  mutex?: ISyncMutex;
  logger?: ISyncLogger;
  autoRunner?: SyncAutoRunner;
  lifecycleService?: SyncOperationLifecycleService;
  enableAutoSync?: boolean;
}

export interface PushResult {
  processed: number;
  failed: number;
  conflicts: number;
}

export type ConflictStrategy = 'server' | 'local' | 'merge' | 'manual';
