import { Injectable, Logger } from '@nestjs/common';
import type {
  HealthCheckResponse,
  HealthCheckResult,
  IHealthIndicator,
} from './health.interface';
import { HealthStatus } from './health.interface';

/**
 * Health Check Service
 * Orchestrates health checks from all registered indicators
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private readonly indicators: Map<string, IHealthIndicator> = new Map();

  registerIndicator(name: string, indicator: IHealthIndicator): void {
    this.indicators.set(name, indicator);
    this.logger.log(`Registered health indicator: ${name}`);
  }

  unregisterIndicator(name: string): void {
    this.indicators.delete(name);
    this.logger.log(`Unregistered health indicator: ${name}`);
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    const checks: Record<string, HealthCheckResult> = {};
    const checkPromises: Promise<void>[] = [];

    for (const [name, indicator] of this.indicators.entries()) {
      const checkPromise = indicator
        .check()
        .then((result) => {
          checks[name] = result;
        })
        .catch((error) => {
          this.logger.error(`Health check failed for ${name}: ${error}`);
          checks[name] = {
            status: HealthStatus.DOWN,
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          };
        });

      checkPromises.push(checkPromise);
    }

    await Promise.allSettled(checkPromises);

    const statuses = Object.values(checks).map((check) => check.status);
    const overallStatus = this.determineOverallStatus(statuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  async checkIndicator(name: string): Promise<HealthCheckResult> {
    const indicator = this.indicators.get(name);

    if (!indicator) {
      return {
        status: HealthStatus.DOWN,
        message: `Health indicator '${name}' not found`,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      return await indicator.check();
    } catch (error) {
      this.logger.error(`Health check failed for ${name}: ${error}`);
      return {
        status: HealthStatus.DOWN,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.length === 0) {
      return HealthStatus.DEGRADED;
    }

    if (statuses.some((status) => status === HealthStatus.DOWN)) {
      return HealthStatus.DOWN;
    }

    if (statuses.some((status) => status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.UP;
  }
}
