import { Global, Module } from '@nestjs/common';
import { StructuredLoggerService } from './logger.service';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';
import { LoggingInterceptor } from './logging.interceptor';

/**
 * Logger Module
 * 
 * Provides structured logging với correlation IDs
 * Global module - available to all modules
 */
@Global()
@Module({
  providers: [
    StructuredLoggerService,
    CorrelationIdInterceptor,
    LoggingInterceptor,
  ],
  exports: [
    StructuredLoggerService,
    CorrelationIdInterceptor,
    LoggingInterceptor,
  ],
})
export class LoggerModule {}
