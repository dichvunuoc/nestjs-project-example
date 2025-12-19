/**
 * Cache service interface
 * Provides abstraction for different caching implementations
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void>;
  mdelete(keys: string[]): Promise<void>;
  incr(key: string, by?: number): Promise<number>;
  decr(key: string, by?: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

/**
 * Cache options interface
 */
export interface CacheOptions {
  defaultTtl?: number;
  keyPrefix?: string;
  maxEntries?: number;
  cleanupInterval?: number;
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
  key?: string | ((...args: any[]) => string);
  ttl?: number;
  condition?: (result: any, args: any[]) => boolean;
  cacheNull?: boolean;
  invalidateOn?: string[];
}
