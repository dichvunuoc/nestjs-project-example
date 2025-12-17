import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsController } from './metrics.controller';

/**
 * Metrics Module
 * 
 * Provides Prometheus metrics collection
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [MetricsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [MetricsService, MetricsInterceptor],
  controllers: [MetricsController],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
