import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type { ICacheService } from 'src/libs/core/infrastructure';
import { CACHE_SERVICE_TOKEN } from 'src/libs/core/constants';
import type {
  IdempotencyOptions,
  IdempotencyResult,
} from 'src/libs/core/application';

/**
 * Idempotency Service
 *
 * Manages idempotent command execution by:
 * - Checking if a command was already processed
 * - Storing results of processed commands
 * - Returning cached results for duplicate commands
 *
 * Requires ICacheService to be injected for persistence.
 * Falls back to in-memory storage if cache not available.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly DEFAULT_PREFIX = 'idempotency';

  // Fallback in-memory storage when cache service not available
  private readonly memoryStore = new Map<
    string,
    { result: IdempotencyResult; expiresAt: number }
  >();

  constructor(
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    if (!this.cacheService) {
      this.logger.warn(
        'IdempotencyService initialized without cache service. Using in-memory storage.',
      );
    }
  }

  /**
   * Check if a command was already processed
   *
   * @param idempotencyKey - Unique key for the command
   * @param options - Idempotency options
   * @returns Cached result if exists, null otherwise
   */
  async getExisting<T>(
    idempotencyKey: string,
    options?: IdempotencyOptions,
  ): Promise<IdempotencyResult<T> | null> {
    const cacheKey = this.buildCacheKey(idempotencyKey, options);

    if (this.cacheService) {
      try {
        const cached =
          await this.cacheService.get<IdempotencyResult<T>>(cacheKey);
        if (cached) {
          this.logger.debug(
            `Idempotency HIT: ${idempotencyKey} (stored at ${cached.storedAt.toISOString()})`,
          );
          return cached;
        }
      } catch (error) {
        this.logger.warn(
          `Cache error checking idempotency for ${idempotencyKey}: ${error}`,
        );
      }
    } else {
      // Fallback to memory store
      const entry = this.memoryStore.get(cacheKey);
      if (entry && entry.expiresAt > Date.now()) {
        this.logger.debug(`Idempotency HIT (memory): ${idempotencyKey}`);
        return entry.result as IdempotencyResult<T>;
      } else if (entry) {
        // Cleanup expired entry
        this.memoryStore.delete(cacheKey);
      }
    }

    this.logger.debug(`Idempotency MISS: ${idempotencyKey}`);
    return null;
  }

  /**
   * Store the result of a processed command
   *
   * @param idempotencyKey - Unique key for the command
   * @param result - Result to store
   * @param commandType - Type of command (for logging/debugging)
   * @param options - Idempotency options
   */
  async store<T>(
    idempotencyKey: string,
    result: T,
    commandType: string,
    options?: IdempotencyOptions,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(idempotencyKey, options);
    const ttl = options?.ttlSeconds ?? this.DEFAULT_TTL;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const idempotencyResult: IdempotencyResult<T> = {
      result,
      storedAt: now,
      expiresAt,
      commandType,
    };

    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, idempotencyResult, ttl);
        this.logger.debug(
          `Stored idempotency result for ${idempotencyKey} (TTL: ${ttl}s)`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store idempotency result for ${idempotencyKey}: ${error}`,
        );
      }
    } else {
      // Fallback to memory store
      this.memoryStore.set(cacheKey, {
        result: idempotencyResult,
        expiresAt: expiresAt.getTime(),
      });
      this.logger.debug(
        `Stored idempotency result (memory) for ${idempotencyKey}`,
      );

      // Cleanup old entries periodically (simple implementation)
      this.cleanupMemoryStore();
    }
  }

  /**
   * Remove idempotency entry (useful for testing or manual cleanup)
   */
  async remove(
    idempotencyKey: string,
    options?: IdempotencyOptions,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(idempotencyKey, options);

    if (this.cacheService) {
      await this.cacheService.delete(cacheKey);
    } else {
      this.memoryStore.delete(cacheKey);
    }

    this.logger.debug(`Removed idempotency entry: ${idempotencyKey}`);
  }

  /**
   * Build cache key from idempotency key and options
   */
  private buildCacheKey(
    idempotencyKey: string,
    options?: IdempotencyOptions,
  ): string {
    const prefix = options?.keyPrefix ?? this.DEFAULT_PREFIX;
    return `${prefix}:${idempotencyKey}`;
  }

  /**
   * Cleanup expired entries from memory store
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt < now) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired idempotency entries`);
    }
  }
}
