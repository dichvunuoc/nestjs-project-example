import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ICacheService } from './cache.interface';
import type { CacheOptions } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiry: number | null;
}

/**
 * In-memory cache implementation
 */
@Injectable()
export class MemoryCacheService implements ICacheService, OnModuleDestroy {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly defaultTtl: number;
  private readonly keyPrefix: string;
  private readonly maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.defaultTtl || 300; // 5 minutes
    this.keyPrefix = options.keyPrefix || '';
    this.maxEntries = options.maxEntries || 1000;

    // Start cleanup interval
    if (options.cleanupInterval !== 0) {
      const intervalMs = options.cleanupInterval || 60000; // 1 minute
      this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(fullKey);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expiry = ttl ? Date.now() + ttl * 1000 : null;

    // Check max entries limit
    if (this.cache.size >= this.maxEntries && !this.cache.has(fullKey)) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(fullKey, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.cache.delete(fullKey);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    return results;
  }

  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  async mdelete(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  async incr(key: string, by: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + by;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string, by: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) - by;
    await this.set(key, newValue);
    return newValue;
  }

  async ttl(key: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry || !entry.expiry) {
      return -1;
    }

    const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2; // -2 means expired
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitRate: 0, // Could track hits/misses if needed
    };
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private getFullKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
