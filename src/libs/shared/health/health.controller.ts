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
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async readiness(): Promise<HealthCheckResponse> {
    const health = await this.healthService.checkHealth();

    if (health.status === HealthStatus.DOWN) {
      throw new ServiceUnavailableException('Service is not ready', {
        description: 'Service is not ready',
      });
    }

    return health;
  }
}
