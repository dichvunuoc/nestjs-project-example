import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import type { ICacheService } from '../../caching/cache.interface';
import type { IHealthIndicator, HealthCheckResult } from '../health.interface';
import { HealthStatus } from '../health.interface';

export const CACHE_SERVICE_TOKEN = Symbol('ICacheService');

/**
 * Redis Health Indicator
 * Checks Redis cache connection health
 */
@Injectable()
export class RedisHealthIndicator implements IHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    if (!this.cacheService) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Redis cache service is not configured',
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      const testKey = 'health:check:' + Date.now();
      const testValue = 'health_check';

      await this.cacheService.set(testKey, testValue, 5);
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);

      const responseTime = Date.now() - startTime;

      if (retrieved === testValue) {
        return {
          status: HealthStatus.UP,
          message: 'Redis cache is healthy',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: HealthStatus.DOWN,
        message: 'Redis cache returned unexpected value',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Redis health check failed: ${(error as Error).message}`,
      );

      return {
        status: HealthStatus.DOWN,
        message: 'Redis cache connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
