/**
 * @avileo/drizzle-sync/client/storage
 *
 * Storage abstraction layer for drizzle-sync.
 * Provides a unified interface for all key-value storage operations.
 */

export type {
  IKVStorage,
  StorageKeyConfig,
  StorageKeyKind,
  LogoutCleanupConfig,
  StorageConfig,
} from "./types";

export { STORAGE_KEYS } from "./types";

export {
  StorageAdapter,
  createStorageAdapter,
  createLocalStorageBackend,
  createNoOpStorage,
  createMemoryStorage,
  resolveStorageKey,
} from "./storage";
