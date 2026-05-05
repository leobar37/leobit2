type StorageValue<T> = {
  v: T;
  ts: number;
  ver: number;
};

interface ScopedCacheOptions<T> {
  scope: string;
  ttlMs?: number;
  version?: number;
  migrate?: (old: unknown) => T | null;
}

interface ScopedCache<T> {
  get(scopeId: string): T | null;
  getOrDefault(scopeId: string, defaultValue: T): T;
  set(scopeId: string, value: T): void;
  remove(scopeId: string): void;
  clear(): void;
  subscribe(callback: (scopeId: string, value: T | null) => void): () => void;
}

function buildKey(scope: string, scopeId: string, version: number): string {
  return `${scope}:${scopeId}:v${version}`;
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function createScopedCache<T>(
  options: ScopedCacheOptions<T>
): ScopedCache<T> {
  const { scope, ttlMs, version = 1, migrate } = options;

  const listeners = new Set<(scopeId: string, value: T | null) => void>();
  let bc: BroadcastChannel | null = null;

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel(`scoped-cache:${scope}`);
      bc.onmessage = (event) => {
        const { scopeId, value } = event.data as {
          scopeId: string;
          value: T | null;
        };
        listeners.forEach((cb) => cb(scopeId, value));
      };
    } catch {
      // BroadcastChannel not available
    }
  }

  // Fallback: listen to storage events for cross-tab sync
  const handleStorage = (event: StorageEvent) => {
    if (!event.key?.startsWith(`${scope}:`)) return;
    const scopeId = event.key.split(":")[1];
    if (!scopeId) return;

    const value = event.newValue
      ? deserialize(event.key, event.newValue)
      : null;
    listeners.forEach((cb) => cb(scopeId, value));
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  function deserialize(key: string, raw: string): T | null {
    try {
      const parsed = JSON.parse(raw) as StorageValue<unknown>;

      // Check version
      if (parsed.ver !== version) {
        if (migrate) {
          const migrated = migrate(parsed.v);
          if (migrated !== null) {
            // Save migrated value
            setRaw(key, migrated);
            return migrated;
          }
        }
        return null;
      }

      // Check TTL
      if (ttlMs && Date.now() - parsed.ts > ttlMs) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.v as T;
    } catch {
      return null;
    }
  }

  function setRaw(key: string, value: T): void {
    if (!isStorageAvailable()) return;
    try {
      const payload: StorageValue<T> = {
        v: value,
        ts: Date.now(),
        ver: version,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }

  function get(scopeId: string): T | null {
    if (!isStorageAvailable()) return null;

    const key = buildKey(scope, scopeId, version);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    return deserialize(key, raw);
  }

  function getOrDefault(scopeId: string, defaultValue: T): T {
    const cached = get(scopeId);
    return cached !== null ? cached : defaultValue;
  }

  function set(scopeId: string, value: T): void {
    if (!isStorageAvailable()) return;

    const key = buildKey(scope, scopeId, version);
    setRaw(key, value);

    // Notify other tabs via BroadcastChannel
    if (bc) {
      try {
        bc.postMessage({ scopeId, value });
      } catch {
        // Ignore broadcast errors
      }
    }

    // Notify local listeners
    listeners.forEach((cb) => cb(scopeId, value));
  }

  function remove(scopeId: string): void {
    if (!isStorageAvailable()) return;

    const key = buildKey(scope, scopeId, version);
    localStorage.removeItem(key);

    if (bc) {
      try {
        bc.postMessage({ scopeId, value: null });
      } catch {
        // Ignore
      }
    }

    listeners.forEach((cb) => cb(scopeId, null));
  }

  function clear(): void {
    if (!isStorageAvailable()) return;

    const prefix = `${scope}:`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (bc) {
      try {
        bc.postMessage({ scopeId: "*", value: null });
      } catch {
        // Ignore
      }
    }

    listeners.forEach((cb) => cb("*", null));
  }

  function subscribe(
    callback: (scopeId: string, value: T | null) => void
  ): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }

  return {
    get,
    getOrDefault,
    set,
    remove,
    clear,
    subscribe,
  };
}
