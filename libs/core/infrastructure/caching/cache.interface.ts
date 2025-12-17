/**
 * Cache service interface
 * Provides abstraction for different caching implementations
 */
export interface ICacheService {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists in cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Get multiple values
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple values
   */
  mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void>;

  /**
   * Delete multiple keys
   */
  mdelete(keys: string[]): Promise<void>;

  /**
   * Increment numeric value
   */
  incr(key: string, by?: number): Promise<number>;

  /**
   * Decrement numeric value
   */
  decr(key: string, by?: number): Promise<number>;

  /**
   * Get TTL of key
   */
  ttl(key: string): Promise<number>;
}

/**
 * Cache options interface
 */
export interface CacheOptions {
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;

  /**
   * Key prefix for namespacing
   */
  keyPrefix?: string;

  /**
   * Maximum number of entries (for in-memory cache)
   */
  maxEntries?: number;

  /**
   * Cleanup interval in milliseconds (for in-memory cache)
   */
  cleanupInterval?: number;

  /**
   * Redis connection options
   */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
}

/**
 * Cache decorator options
 */
export interface CacheDecoratorOptions {
  /**
   * Cache key generator function
   */
  key?: string | ((...args: any[]) => string);

  /**
   * TTL in seconds
   */
  ttl?: number;

  /**
   * Condition to cache result
   */
  condition?: (result: any, args: any[]) => boolean;

  /**
   * Whether to cache null/undefined values
   */
  cacheNull?: boolean;

  /**
   * Cache invalidation strategy
   */
  invalidateOn?: string[]; // Method names that invalidate this cache
}
