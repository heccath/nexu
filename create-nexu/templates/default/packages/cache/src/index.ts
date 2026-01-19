export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
}

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class Cache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl?: number;
  private maxSize?: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl;
    this.maxSize = options.maxSize;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }

  private evictIfNeeded(): void {
    if (!this.maxSize || this.store.size < this.maxSize) return;

    // Remove expired entries first
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
      }
    }

    // If still over limit, remove oldest entries
    if (this.store.size >= this.maxSize) {
      const keysToDelete = this.store.size - this.maxSize + 1;
      const keys = Array.from(this.store.keys()).slice(0, keysToDelete);
      keys.forEach(key => this.store.delete(key));
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    this.evictIfNeeded();

    const effectiveTtl = ttl ?? this.ttl;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: effectiveTtl ? Date.now() + effectiveTtl : undefined,
    };

    this.store.set(key, entry);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    // Clean expired entries first
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
      }
    }
    return this.store.size;
  }

  keys(): string[] {
    return Array.from(this.store.keys()).filter(key => this.has(key));
  }

  values(): T[] {
    return this.keys().map(key => this.get(key)!);
  }

  entries(): [string, T][] {
    return this.keys().map(key => [key, this.get(key)!]);
  }

  async getOrSet(key: string, factory: () => T | Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Memoization helper
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: CacheOptions & { keyFn?: (...args: Parameters<T>) => string } = {}
): T {
  const cache = new Cache<ReturnType<T>>(options);
  const keyFn = options.keyFn ?? ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>) => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

// Default cache instance
export const cache = new Cache();

// Factory function
export function createCache<T = unknown>(options: CacheOptions = {}): Cache<T> {
  return new Cache<T>(options);
}
