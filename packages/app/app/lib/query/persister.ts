import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { isPersistedRemoteQueryKey } from "./persisted-query-keys";

const STORAGE_KEY = "avileo-react-query-cache";
const BUSTER_KEY = "avileo-query-buster";

interface PersistedData {
  client: PersistedClient;
  buster: string;
}

function filterPersistedClient(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.filter((query) =>
        isPersistedRemoteQueryKey(query.queryKey)
      ),
    },
  };
}

function getDefaultStorage(): Storage {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    get length() {
      return 0;
    },
  };
}

export function createQueryPersister(
  storage: Storage = getDefaultStorage(),
  buster?: string
): Persister {
  const currentBuster = buster ?? "default";

  return {
    persistClient: async (client) => {
      const filtered = filterPersistedClient(client);
      const data: PersistedData = {
        client: filtered,
        buster: currentBuster,
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (buster) {
        storage.setItem(BUSTER_KEY, buster);
      }
    },
    restoreClient: async () => {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        return undefined;
      }

      // Check buster mismatch
      const storedBuster = storage.getItem(BUSTER_KEY);
      if (buster && storedBuster && storedBuster !== currentBuster) {
        console.log("[Persister] Buster mismatch, clearing cache");
        storage.removeItem(STORAGE_KEY);
        return undefined;
      }

      const parsed = JSON.parse(raw) as PersistedData;

      // Handle legacy format (without buster wrapper)
      if (!parsed.client || !parsed.buster) {
        const legacyClient = parsed as unknown as PersistedClient;
        return filterPersistedClient(legacyClient);
      }

      // Check buster in data object
      if (parsed.buster !== currentBuster) {
        console.log("[Persister] Buster mismatch in data, clearing cache");
        storage.removeItem(STORAGE_KEY);
        return undefined;
      }

      return filterPersistedClient(parsed.client);
    },
    removeClient: async () => {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(BUSTER_KEY);
    },
  };
}

export function clearPersistedQueryCache(storage: Storage = getDefaultStorage()): void {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(BUSTER_KEY);
}

export function getStoredBuster(storage: Storage = getDefaultStorage()): string | null {
  return storage.getItem(BUSTER_KEY);
}
