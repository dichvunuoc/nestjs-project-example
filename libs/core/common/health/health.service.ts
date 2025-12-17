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

  /**
   * Register a health indicator
   * @param name Indicator name
   * @param indicator Health indicator instance
   */
  registerIndicator(name: string, indicator: IHealthIndicator): void {
    this.indicators.set(name, indicator);
    this.logger.log(`Registered health indicator: ${name}`);
  }

  /**
   * Unregister a health indicator
   * @param name Indicator name
   */
  unregisterIndicator(name: string): void {
    this.indicators.delete(name);
    this.logger.log(`Unregistered health indicator: ${name}`);
  }

  /**
   * Check health of all registered indicators
   * @returns Promise resolving to overall health check response
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    const checks: Record<string, HealthCheckResult> = {};
    const checkPromises: Promise<void>[] = [];

    // Run all health checks in parallel
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

    // Wait for all checks to complete
    await Promise.allSettled(checkPromises);

    // Determine overall status
    const statuses = Object.values(checks).map((check) => check.status);
    const overallStatus = this.determineOverallStatus(statuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // Uptime in seconds
      checks,
    };
  }

  /**
   * Check health of a specific indicator
   * @param name Indicator name
   * @returns Promise resolving to health check result
   */
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

  /**
   * Determine overall status from individual statuses
   * - If any is DOWN, overall is DOWN
   * - If any is DEGRADED, overall is DEGRADED
   * - Otherwise, overall is UP
   */
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




