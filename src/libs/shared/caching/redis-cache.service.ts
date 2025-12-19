import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import type { ICacheService, CacheOptions } from './cache.interface';

/**
 * Redis cache implementation
 */
@Injectable()
export class RedisCacheService
  implements ICacheService, OnModuleInit, OnModuleDestroy
{
  private readonly redis: RedisClientType;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;
  private readonly logger = new Logger(RedisCacheService.name);
  private isConnecting = false;

  constructor(options: CacheOptions = {}) {
    if (!options.redis) {
      throw new Error('Redis configuration is required');
    }

    this.keyPrefix = options.redis.keyPrefix || options.keyPrefix || '';
    this.defaultTtl = options.defaultTtl || 300;

    this.redis = createClient({
      socket: {
        host: options.redis.host,
        port: options.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: options.redis.password,
      database: options.redis.db || 0,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.log('Connecting to Redis...');
      this.isConnecting = true;
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis connected successfully');
      this.isConnecting = false;
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });

    this.redis.on('end', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Attempting to reconnect to Redis...');
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      if (!this.redis.isOpen && !this.isConnecting) {
        await this.redis.connect();
      }
    } catch (error) {
      this.logger.error('Failed to connect to Redis on module init', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.redis.get(fullKey);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      const expiry = ttl ?? this.defaultTtl;

      if (expiry > 0) {
        await this.redis.setEx(fullKey, expiry, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.redis.exists(fullKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to check existence of key: ${key}`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.keyPrefix) {
        const pattern = `${this.keyPrefix}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          this.logger.log(
            `Cleared ${keys.length} keys with prefix: ${this.keyPrefix}`,
          );
        }
      } else {
        await this.redis.flushDb();
        this.logger.warn('Cleared entire Redis database');
      }
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
      throw error;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    try {
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const values = await this.redis.mGet(fullKeys);
      return values.map((value) => (value ? (JSON.parse(value) as T) : null));
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys', error);
      return new Array(keys.length).fill(null) as (T | null)[];
    }
  }

  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    if (entries.length === 0) return;

    try {
      const multi = this.redis.multi();

      for (const entry of entries) {
        const fullKey = this.getFullKey(entry.key);
        const serializedValue = JSON.stringify(entry.value);
        const expiry = entry.ttl ?? this.defaultTtl;

        if (expiry > 0) {
          multi.setEx(fullKey, expiry, serializedValue);
        } else {
          multi.set(fullKey, serializedValue);
        }
      }

      await multi.exec();
    } catch (error) {
      this.logger.error('Failed to set multiple cache keys', error);
      throw error;
    }
  }

  async mdelete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      const fullKeys = keys.map((key) => this.getFullKey(key));
      await this.redis.del(fullKeys);
    } catch (error) {
      this.logger.error('Failed to delete multiple cache keys', error);
    }
  }

  async incr(key: string, by = 1): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      return await this.redis.incrBy(fullKey, by);
    } catch (error) {
      this.logger.error(`Failed to increment cache key: ${key}`, error);
      return 0;
    }
  }

  async decr(key: string, by = 1): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      return await this.redis.decrBy(fullKey, by);
    } catch (error) {
      this.logger.error(`Failed to decrement cache key: ${key}`, error);
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`Failed to get TTL for cache key: ${key}`, error);
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      await this.redis.expire(fullKey, seconds);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set expiration for key: ${key}`, error);
      return false;
    }
  }

  getClient(): RedisClientType {
    return this.redis;
  }

  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryInfo: string | null;
  }> {
    try {
      const info = await this.redis.info('memory');
      let keyCount = 0;

      if (this.keyPrefix) {
        const pattern = `${this.keyPrefix}:*`;
        const keys = await this.redis.keys(pattern);
        keyCount = keys.length;
      } else {
        keyCount = await this.redis.dbSize();
      }

      return {
        connected: this.redis.isReady,
        keyCount,
        memoryInfo: info,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', error);
      return {
        connected: false,
        keyCount: 0,
        memoryInfo: null,
      };
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redis.isOpen) {
        await this.redis.quit();
        this.logger.log('Redis connection closed gracefully');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connection', error);
    }
  }

  private getFullKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }
}
