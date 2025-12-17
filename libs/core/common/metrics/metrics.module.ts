import { Global, Module } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus-metrics.service';
import { MetricsInterceptor, METRICS_TOKEN } from './metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { IMetricsService } from './metrics.interface';

/**
 * Metrics Module
 * Provides Prometheus metrics collection and exposure
 * Global module - available throughout the application
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    PrometheusMetricsService,
    {
      provide: METRICS_TOKEN,
      useExisting: PrometheusMetricsService,
    },
    MetricsInterceptor,
  ],
  exports: [PrometheusMetricsService, METRICS_TOKEN, MetricsInterceptor],
})
export class MetricsModule {}
