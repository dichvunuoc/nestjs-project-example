import { Global, Module } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { TracingInterceptor } from './tracing.interceptor';

/**
 * Tracing Module
 * 
 * Provides OpenTelemetry distributed tracing
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [TracingModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [TracingService, TracingInterceptor],
  exports: [TracingService, TracingInterceptor],
})
export class TracingModule {}
