import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ICacheService } from './cache.interface';

/**
 * Cache decorator key metadata
 */
const CACHE_KEY_METADATA = 'cache:key';
const CACHE_TTL_METADATA = 'cache:ttl';
const CACHE_CONDITION_METADATA = 'cache:condition';
const CACHE_INVALIDATE_METADATA = 'cache:invalidate';

/**
 * Cache decorator for methods
 * Caches the result of a method call
 */
export function Cache(
  options: {
    key?: string;
    ttl?: number;
    condition?: (result: any, args: any[]) => boolean;
    cacheNull?: boolean;
  } = {},
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // Store metadata
    Reflect.defineMetadata(
      CACHE_KEY_METADATA,
      options.key,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      CACHE_TTL_METADATA,
      options.ttl,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      CACHE_CONDITION_METADATA,
      options.condition,
      target,
      propertyKey,
    );

    descriptor.value = async function (...args: any[]) {
      // Get cache service from instance
      const cacheService: ICacheService = this.cacheService;

      if (!cacheService) {
        // If no cache service, just execute original method
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = generateCacheKey(
        options.key || `${target.constructor.name}:${propertyKey}`,
        args,
      );

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check condition if provided
      if (options.condition && !options.condition(result, args)) {
        return result;
      }

      // Cache the result (including null if cacheNull is true)
      if (result !== null || options.cacheNull) {
        await cacheService.set(cacheKey, result, options.ttl);
      }

      return result;
    };
  };
}

/**
 * Cache invalidation decorator
 * Invalidates cache keys when method is called
 */
export function CacheInvalidate(keys: string | string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const invalidateKeys = Array.isArray(keys) ? keys : [keys];

    // Store metadata
    Reflect.defineMetadata(
      CACHE_INVALIDATE_METADATA,
      invalidateKeys,
      target,
      propertyKey,
    );

    descriptor.value = async function (...args: any[]) {
      // Get cache service from instance
      const cacheService: ICacheService = this.cacheService;

      // Execute original method first
      const result = await originalMethod.apply(this, args);

      // Invalidate cache keys
      if (cacheService) {
        for (const key of invalidateKeys) {
          const fullKey = generateCacheKey(key, args);
          await cacheService.delete(fullKey);
        }
      }

      return result;
    };
  };
}

/**
 * Cache interceptor for NestJS
 * Automatically handles caching based on decorators
 */
@Injectable()
export class CacheInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: ICacheService,
  ) {}

  async intercept(context: any, next: any) {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if method has Cache decorator
    const hasCache = this.reflector.get<boolean>('cache', handler);
    if (!hasCache) {
      return next.handle();
    }

    // Get cache options
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const cacheTtl = this.reflector.get<number>(CACHE_TTL_METADATA, handler);
    const cacheCondition = this.reflector.get<Function>(
      CACHE_CONDITION_METADATA,
      handler,
    );

    // Generate cache key
    const request = context.switchToHttp().getRequest();
    const key = cacheKey || `${controller.name}:${handler.name}:${request.url}`;

    // Try to get from cache
    const cached = await this.cacheService.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute the handler
    const result = await next.handle();

    // Check condition if provided
    if (cacheCondition && !cacheCondition(result, [])) {
      return result;
    }

    // Cache the result
    await this.cacheService.set(key, result, cacheTtl);

    return result;
  }
}

/**
 * Generate cache key from base key and arguments
 */
function generateCacheKey(baseKey: string, args: any[]): string {
  if (args.length === 0) {
    return baseKey;
  }

  // Serialize arguments to create a unique key
  const serializedArgs = args.map((arg) => {
    if (arg === null || arg === undefined) {
      return 'null';
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  });

  return `${baseKey}:${serializedArgs.join(':')}`;
}
