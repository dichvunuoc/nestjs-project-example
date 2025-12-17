import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthStatus, type HealthCheckResponse } from './health.interface';

/**
 * Health Check Controller
 * Provides health check endpoints for monitoring and load balancers
 *
 * Endpoints:
 * - GET /health - Overall health check
 * - GET /health/live - Liveness probe (basic check)
 * - GET /health/ready - Readiness probe (checks dependencies)
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Overall health check endpoint
   * Returns detailed health status of all registered indicators
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }

  /**
   * Liveness probe endpoint
   * Simple check to verify the application is running
   * Returns 200 if the service is alive
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe endpoint
   * Checks if the application is ready to serve traffic
   * Returns 200 if all critical dependencies are healthy
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async readiness(): Promise<HealthCheckResponse> {
    const health = await this.healthService.checkHealth();

    // If overall status is DOWN, return 503 Service Unavailable
    if (health.status === HealthStatus.DOWN) {
      throw new ServiceUnavailableException('Service is not ready', {
        description: 'Service is not ready',
      });
    }

    return health;
  }
}
