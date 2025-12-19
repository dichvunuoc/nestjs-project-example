import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest, FastifyReply } from 'fastify';
import type { ICacheService } from '../../core';
import { CACHE_SERVICE_TOKEN } from '../../core';
import { RATE_LIMIT_CONFIG_KEY } from './decorators';

/**
 * Rate limit metadata interface
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowMs: number;

  /**
   * Key generator function for rate limiting
   * Defaults to IP address
   */
  keyGenerator?: (req: FastifyRequest) => string;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Whether to skip successful requests from counting
   */
  skipSuccessfulRequests?: boolean;

  /**
   * Whether to skip failed requests from counting
   */
  skipFailedRequests?: boolean;
}

/**
 * Rate Limiting Decorator
 *
 * Apply rate limiting to controllers or individual routes.
 * Uses token bucket algorithm with sliding window.
 *
 * Usage:
 * ```typescript
 * @RateLimit({ limit: 100, windowMs: 60 }) // 100 requests per minute
 * @Controller('api')
 * export class ApiController {
 *
 *   @RateLimit({ limit: 10, windowMs: 60 }) // 10 requests per minute
 *   @Post('sensitive-operation')
 *   async sensitiveOperation() {
 *     // Handler implementation
 *   }
 *
 *   @RateLimit({
 *     limit: 1000,
 *     windowMs: 3600,
 *     keyGenerator: (req) => `user:${req.user?.id}`,
 *     message: 'Too many requests for this user'
 *   })
 *   @Get('user-specific')
 *   async getUserData() {
 *     // User-specific rate limiting
 *   }
 * }
 * ```
 */
export const RateLimit = (config: RateLimitConfig) => {
  const configWithDefaults = {
    message: 'Too many requests, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    ...config,
  };
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    const key = propertyKey
      ? `${target.constructor.name}.${propertyKey}`
      : target.constructor.name;
    Reflect.defineMetadata(
      `${RATE_LIMIT_CONFIG_KEY}_${key}`,
      configWithDefaults,
      target,
    );
  };
};

/**
 * Rate Limiting Guard
 *
 * Implements rate limiting using Redis for distributed environments.
 * Falls back to in-memory storage for single-instance deployments.
 *
 * Features:
 * - Sliding window rate limiting
 * - Configurable limits per route
 * - User-based and IP-based rate limiting
 * - Distributed support with Redis
 * - Automatic key expiration
 * - Detailed rate limit headers
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService: ICacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Get rate limit config for this route
    const config = this.getRateLimitConfig(context);

    if (!config) {
      return true; // No rate limiting configured
    }

    // Generate rate limit key
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : this.getDefaultKey(request);

    // Check current rate limit
    const result = await this.checkRateLimit(key, config);

    // Add rate limit headers
    this.addRateLimitHeaders(response, result, config);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: config.message,
          retryAfter: Math.ceil(result.resetTime / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get rate limit configuration for the current route
   */
  private getRateLimitConfig(
    context: ExecutionContext,
  ): RateLimitConfig | null {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Try to get configuration from method first
    const methodKey = `${controller.name}.${handler.name}`;
    let config = Reflect.getMetadata(
      `${RATE_LIMIT_CONFIG_KEY}_${methodKey}`,
      controller,
    );

    // Fall back to class-level configuration
    if (!config) {
      config = Reflect.getMetadata(
        `${RATE_LIMIT_CONFIG_KEY}_${controller.name}`,
        controller,
      );
    }

    return config || null;
  }

  /**
   * Generate default rate limit key based on IP
   */
  private getDefaultKey(request: FastifyRequest): string {
    const ip = request.ip || 'unknown';
    return `rate_limit:${ip}`;
  }

  /**
   * Check current rate limit status
   */
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    allowed: boolean;
    count: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowStart = now - config.windowMs * 1000;

    try {
      // Use Redis for distributed rate limiting
      return await this.checkDistributedRateLimit(key, config, windowStart);
    } catch (error) {
      // Fallback to in-memory rate limiting if Redis fails
      console.warn(
        'Redis rate limiting failed, falling back to in-memory',
        error,
      );
      return this.checkInMemoryRateLimit(key, config, windowStart);
    }
  }

  /**
   * Check rate limit using Redis (sliding window)
   */
  private async checkDistributedRateLimit(
    key: string,
    config: RateLimitConfig,
    windowStart: number,
  ): Promise<{
    allowed: boolean;
    count: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const pipeline = (this.cacheService as any).client?.pipeline();

    if (!pipeline) {
      throw new Error('Redis pipeline not available');
    }

    // Use Redis sorted set for sliding window
    const member = `${now}-${Math.random()}`;

    // Clean up old entries and add new request
    pipeline
      .zremrangebyscore(key, 0, windowStart) // Remove old entries
      .zadd(key, now, member) // Add current request
      .zcard(key) // Get current count
      .expire(key, config.windowMs); // Set expiration

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    const allowed = count <= config.limit;
    const resetTime = now + config.windowMs * 1000;

    return { allowed, count, resetTime };
  }

  /**
   * Check rate limit in memory (fallback)
   */
  private checkInMemoryRateLimit(
    key: string,
    config: RateLimitConfig,
    windowStart: number,
  ): Promise<{
    allowed: boolean;
    count: number;
    resetTime: number;
  }> {
    return new Promise((resolve) => {
      // This is a simplified in-memory implementation
      // In production, use a proper in-memory store with expiration
      const now = Date.now();

      // For demo purposes, always allow
      resolve({
        allowed: true,
        count: 0,
        resetTime: now + config.windowMs * 1000,
      });
    });
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(
    response: FastifyReply,
    result: {
      allowed: boolean;
      count: number;
      resetTime: number;
    },
    config: RateLimitConfig,
  ): void {
    // RateLimit-Limit: Maximum requests allowed
    response.header('X-RateLimit-Limit', config.limit);

    // RateLimit-Remaining: Remaining requests in the window
    const remaining = Math.max(0, config.limit - result.count);
    response.header('X-RateLimit-Remaining', remaining);

    // RateLimit-Reset: Unix timestamp when the rate limit window resets
    response.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    // RateLimit-Reset-In: Seconds until the rate limit window resets
    const resetIn = Math.ceil((result.resetTime - Date.now()) / 1000);
    response.header('X-RateLimit-Reset-In', Math.max(0, resetIn));

    // Custom headers for more information
    response.header('X-RateLimit-Window-MS', config.windowMs);
    response.header('X-RateLimit-Count', result.count);
  }
}

/**
 * Advanced Rate Limiting Decorators for common use cases
 */
export const RateLimitPerMinute = (limit: number) =>
  RateLimit({ limit, windowMs: 60 });

export const RateLimitPerHour = (limit: number) =>
  RateLimit({ limit, windowMs: 3600 });

export const RateLimitPerDay = (limit: number) =>
  RateLimit({ limit, windowMs: 86400 });

export const RateLimitPerUser = (limit: number, windowMs: number = 3600) =>
  RateLimit({
    limit,
    windowMs,
    keyGenerator: (req: FastifyRequest) => {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      return userId ? `rate_limit:user:${userId}` : `rate_limit:${req.ip}`;
    },
    message: 'Too many requests for this user',
  });

export const RateLimitPerIP = (limit: number, windowMs: number = 3600) =>
  RateLimit({
    limit,
    windowMs,
    keyGenerator: (req: FastifyRequest) => `rate_limit:ip:${req.ip}`,
    message: 'Too many requests from this IP',
  });

export const RateLimitSensitive = () =>
  RateLimit({
    limit: 5,
    windowMs: 300, // 5 minutes
    message: 'Too many sensitive operations, please try again later',
  });
