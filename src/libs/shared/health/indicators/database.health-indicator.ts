import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import type { IHealthIndicator, HealthCheckResult } from '../health.interface';
import { HealthStatus } from '../health.interface';
import { DATABASE_WRITE_TOKEN } from '../../database/drizzle/database.provider';

export const DATABASE_POOL_TOKEN = Symbol('DATABASE_POOL');

/**
 * Database Health Indicator
 * Checks PostgreSQL database connection health
 */
@Injectable()
export class DatabaseHealthIndicator implements IHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    @Optional()
    @Inject(DATABASE_POOL_TOKEN)
    private readonly pool?: Pool,
  ) {}

  async check(): Promise<HealthCheckResult> {
    if (!this.pool) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Database pool is not configured',
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.pool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      if (result.rows && result.rows.length > 0) {
        return {
          status: HealthStatus.UP,
          message: 'Database connection is healthy',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: HealthStatus.DOWN,
        message: 'Database query returned no results',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Database health check failed: ${(error as Error).message}`,
      );

      return {
        status: HealthStatus.DOWN,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
