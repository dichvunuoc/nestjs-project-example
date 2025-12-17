import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';
import { LoggingInterceptor } from './logging.interceptor';

/**
 * Logger Module
 * 
 * Provides structured logging với correlation ID support
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [LoggerModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [
    LoggerService,
    CorrelationIdInterceptor,
    LoggingInterceptor,
  ],
  exports: [
    LoggerService,
    CorrelationIdInterceptor,
    LoggingInterceptor,
  ],
})
export class LoggerModule {}
