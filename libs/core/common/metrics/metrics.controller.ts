import { Controller, Get } from '@nestjs/common';
import { IMetricsService } from './metrics.interface';
import { METRICS_TOKEN } from './metrics.interceptor';
import { Inject } from '@nestjs/common';

/**
 * Metrics Controller
 * Exposes Prometheus metrics endpoint
 * GET /metrics
 */
@Controller()
export class MetricsController {
  constructor(
    @Inject(METRICS_TOKEN) private readonly metricsService: IMetricsService,
  ) {}

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
