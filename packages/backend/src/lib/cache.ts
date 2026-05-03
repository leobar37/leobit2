/**
 * In-memory cache with TTL and LRU eviction.
 * No external dependencies - uses native Map.
 */

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private readonly jitterMs: number;

  constructor(options: {
    defaultTtlMs: number;
    maxSize?: number;
    jitterMs?: number;
  }) {
    this.defaultTtlMs = options.defaultTtlMs;
    this.maxSize = options.maxSize ?? 1000;
    this.jitterMs = options.jitterMs ?? 30_000; // 30s default jitter
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const baseTtl = ttlMs ?? this.defaultTtlMs;
    const jitter = Math.floor(Math.random() * this.jitterMs);
    const expiresAt = Date.now() + baseTtl + jitter;

    // LRU eviction: if at capacity, remove oldest entry
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, { value, expiresAt });
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  keys(): IterableIterator<K> {
    return this.store.keys();
  }

  /**
   * Evict expired entries. Call periodically or before size-sensitive operations.
   */
  evictExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}
