import { Global, Module } from '@nestjs/common';
import { LoggerService, LOGGER_TOKEN } from './logger.service';
import { PinoLoggerService } from './pino-logger.service';
import { LoggingInterceptor } from './logging.interceptor';

/**
 * Logger Module
 * Provides structured logging functionality
 * Global module - available throughout the application
 */
@Global()
@Module({
  providers: [
    // Provide PinoLoggerService as default implementation
    PinoLoggerService,
    {
      provide: LOGGER_TOKEN,
      useExisting: PinoLoggerService,
    },
    // LoggerService wrapper
    LoggerService,
    // Logging interceptor
    LoggingInterceptor,
  ],
  exports: [LoggerService, LOGGER_TOKEN, LoggingInterceptor],
})
export class LoggerModule {}
