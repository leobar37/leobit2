/**
 * Pull Service Types
 */

import type { ISyncLogger } from "../core";
import type { ISyncMutex } from "./sync-mutex";
import type { ChangeApplier } from "./change-applier";
import type { SyncClientEngineContext } from "../client/types";
import type { ChangeApplierConfig } from "./schema-mapper";

export interface PullServiceOptions {
  httpClient: PullHttpClient;
  applier?: ChangeApplier;
  applierConfig?: ChangeApplierConfig;
  cursorStorage?: CursorStorage;
  mutex?: ISyncMutex;
  logger?: ISyncLogger;
  isOnline?: () => boolean;
}

export interface PullHttpClient {
  getChanges(params: {
    tenantId: string;
    since?: string;
    entityTypes?: string[];
    limit?: number;
  }): Promise<{
    changes: unknown[];
    nextSince: string;
    hasMore: boolean;
  }>;
  abort(): void;
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
  isStuck: boolean;
  consecutiveStalePulls: number;
}

export interface CursorStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryCursorStorage implements CursorStorage {
  private storage = new Map<string, string>();

  get(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.storage.set(key, value);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }
}
