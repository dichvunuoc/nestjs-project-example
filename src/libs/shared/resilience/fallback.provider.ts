import { Injectable, Inject, Optional } from '@nestjs/common';
import { StructuredLogger } from '../observability/structured-logger.service';
import { FALLBACK_CACHE_TOKEN } from './constants';

/**
 * Fallback function type
 */
export type FallbackFunction<T = any> = (
  error: Error,
  context: FallbackContext,
) => Promise<T> | T;

/**
 * Fallback execution context
 */
export interface FallbackContext {
  /**
   * The original operation being attempted
   */
  operation: string;

  /**
   * Arguments passed to the original function
   */
  args: any[];

  /**
   * Attempt count when fallback was triggered
   */
  attempt: number;

  /**
   * Total time spent attempting
   */
  duration: number;

  /**
   * Type of failure that triggered fallback
   */
  failureType: 'timeout' | 'circuit_breaker' | 'retry_exhausted' | 'error';

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Fallback response options
 */
export interface FallbackResponse<T = any> {
  /**
   * The fallback value to return
   */
  value: T;

  /**
   * Whether the fallback represents a degraded but acceptable state
   */
  degraded?: boolean;

  /**
   * Message explaining the fallback state
   */
  message?: string;

  /**
   * Additional metadata about the fallback response
   */
  metadata?: Record<string, any>;
}

/**
 * Fallback Provider Service
 *
 * Provides fallback mechanisms when primary operations fail.
 * Supports different fallback strategies: static values, cached data, or computed values.
 */
@Injectable()
export class FallbackProvider {
  private readonly fallbacks = new Map<string, FallbackFunction>();

  constructor(
    private readonly logger: StructuredLogger,
    @Optional()
    @Inject(FALLBACK_CACHE_TOKEN)
    private readonly fallbackCache?: Map<string, any>,
  ) {}

  /**
   * Register a fallback function for an operation
   */
  register(key: string, fallback: FallbackFunction): void {
    this.fallbacks.set(key, fallback);
    this.logger.debug(`Registered fallback for ${key}`);
  }

  /**
   * Execute fallback for an operation
   */
  async execute(
    key: string,
    error: Error,
    context: FallbackContext,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Check if we have a registered fallback
      const fallback = this.fallbacks.get(key);
      if (!fallback) {
        throw new Error(`No fallback registered for ${key}`);
      }

      // Execute fallback
      this.logger.info(`Executing fallback for ${key}`, {
        operation: { name: key },
        error: error,
        failureType: context.failureType,
        attempt: context.attempt,
      });

      const result = await fallback(error, context);
      const duration = Date.now() - startTime;

      this.logger.info(`Fallback executed successfully for ${key}`, {
        operation: { name: key, duration },
        duration,
        degraded: (result as FallbackResponse)?.degraded,
      });

      return result;
    } catch (fallbackError) {
      const duration = Date.now() - startTime;

      this.logger.error(`Fallback failed for ${key}`, fallbackError as Error, {
        operation: { name: key, duration },
        duration,
        originalError: error,
        data: {
          fallbackError: (fallbackError as Error).message,
        },
      });

      // Fallback failed too, rethrow the original error
      throw error;
    }
  }

  /**
   * Get cached fallback value if available
   */
  getCached(key: string): any {
    if (!this.fallbackCache) {
      return null;
    }

    return this.fallbackCache.get(key);
  }

  /**
   * Set cached fallback value
   */
  setCached(key: string, value: any, ttlMs?: number): void {
    if (!this.fallbackCache) {
      return;
    }

    this.fallbackCache.set(key, value);

    if (ttlMs) {
      setTimeout(() => {
        this.fallbackCache?.delete(key);
      }, ttlMs);
    }
  }

  /**
   * Clear cached fallback value
   */
  clearCached(key: string): boolean {
    if (!this.fallbackCache) {
      return false;
    }

    return this.fallbackCache.delete(key);
  }

  /**
   * Check if fallback exists for operation
   */
  has(key: string): boolean {
    return this.fallbacks.has(key);
  }

  /**
   * Remove fallback registration
   */
  unregister(key: string): boolean {
    return this.fallbacks.delete(key);
  }

  /**
   * Clear all fallbacks
   */
  clear(): void {
    this.fallbacks.clear();
    if (this.fallbackCache) {
      this.fallbackCache.clear();
    }
    this.logger.info('All fallbacks cleared');
  }

  /**
   * Get status of all registered fallbacks
   */
  getStatus(): Array<{
    key: string;
    hasCachedValue: boolean;
    cacheSize: number;
  }> {
    const status: Array<{
      key: string;
      hasCachedValue: boolean;
      cacheSize: number;
    }> = [];

    for (const key of this.fallbacks.keys()) {
      status.push({
        key,
        hasCachedValue: this.fallbackCache?.has(key) || false,
        cacheSize: this.fallbackCache?.size || 0,
      });
    }

    return status;
  }
}

/**
 * Pre-built fallback functions for common scenarios
 */
export class CommonFallbacks {
  /**
   * Return a static value
   */
  static staticValue<T>(value: T): FallbackFunction<T> {
    return () => value;
  }

  /**
   * Return a degraded response with status
   */
  static degradedResponse<T>(
    value: T,
    message: string = 'Service unavailable, showing degraded response',
  ): FallbackFunction<FallbackResponse<T>> {
    return () => ({
      value,
      degraded: true,
      message,
      metadata: { timestamp: new Date().toISOString() },
    });
  }

  /**
   * Return cached value if available
   */
  static cachedValue(
    cacheKey: string,
    provider: FallbackProvider,
  ): FallbackFunction {
    return () => {
      const cached = provider.getCached(cacheKey);
      if (!cached) {
        throw new Error('No cached value available');
      }
      return cached;
    };
  }

  /**
   * Return empty collection for list operations
   */
  static emptyCollection(type: 'array' | 'object' = 'array'): FallbackFunction {
    return () => (type === 'array' ? [] : {});
  }

  /**
   * Return default value for primitive types
   */
  static defaultValue<T>(defaultValue: T): FallbackFunction<T> {
    return () => defaultValue;
  }

  /**
   * Throw a custom error
   */
  throwError(error: Error | string): FallbackFunction<never> {
    return () => {
      throw typeof error === 'string' ? new Error(error) : error;
    };
  }

  /**
   * Execute an alternative operation
   */
  static alternativeOperation<T>(
    alternativeFn: () => Promise<T> | T,
  ): FallbackFunction<T> {
    return async () => await alternativeFn();
  }

  /**
   * Return a paginated empty response
   */
  static emptyPaginatedResponse(
    page: number = 1,
    limit: number = 10,
  ): FallbackFunction {
    return () => ({
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }

  /**
   * Return a health check result
   */
  static healthCheck(
    status: 'healthy' | 'degraded' | 'unhealthy',
    details?: Record<string, any>,
  ): FallbackFunction {
    return () => ({
      status,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  /**
   * Fallback for external API calls
   */
  static externalAPIFallback(
    serviceName: string,
    responseType: 'mock' | 'error' | 'cached' = 'error',
    mockData?: any,
  ): FallbackFunction {
    return (error, context) => {
      console.warn(`External API fallback triggered for ${serviceName}`, {
        service: serviceName,
        error: error.message,
        context,
      });

      switch (responseType) {
        case 'mock':
          return mockData || { mock: true, service: serviceName };

        case 'cached':
        // Note: getCached would need to be implemented or passed in
        // const cached = this.getCached(`api:${serviceName}`);
        // if (cached) {
        //   return { ...cached, cached: true };
        // }
        // Fall through to error if no cache

        case 'error':
        default:
          throw new Error(
            `Service ${serviceName} unavailable: ${error.message}`,
          );
      }
    };
  }
}

/**
 * Fallback decorator
 */
export const Fallback = (
  fallback: FallbackFunction | string,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
  },
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const key =
      typeof fallback === 'string'
        ? fallback
        : `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args);

        // Cache successful result if caching enabled
        if (options?.cacheKey && this.fallbackProvider) {
          this.fallbackProvider.setCached(
            options.cacheKey,
            result,
            options.cacheTTL,
          );
        }

        return result;
      } catch (error) {
        // Execute fallback
        const fallbackFn =
          typeof fallback === 'string'
            ? () => this.fallbackProvider.getCached(fallback)
            : fallback;

        if (!fallbackFn) {
          throw error;
        }

        const context: FallbackContext = {
          operation: key,
          args,
          attempt: 1,
          duration: 0,
          failureType: 'error',
        };

        if (typeof fallbackFn === 'function') {
          return await fallbackFn(error as Error, context);
        }

        throw error;
      }
    };
  };
};
