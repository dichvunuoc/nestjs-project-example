import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import type { ICacheService } from '../../../infrastructure/caching/cache.interface';
import type { IHealthIndicator, HealthCheckResult } from '../health.interface';
import { HealthStatus } from '../health.interface';

/**
 * Redis Health Indicator
 * Checks Redis cache connection health
 */
@Injectable()
export class RedisHealthIndicator implements IHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(
    @Optional()
    @Inject('ICacheService')
    private readonly cacheService?: ICacheService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    // If cache service is not available, return degraded status
    if (!this.cacheService) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Redis cache service is not configured',
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      // Use a test key to check Redis connection
      const testKey = 'health:check:' + Date.now();
      const testValue = 'health_check';

      // Set and get to verify Redis is working
      await this.cacheService.set(testKey, testValue, 5); // 5 seconds TTL
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
      this.logger.error(`Redis health check failed: ${error.message}`);

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

