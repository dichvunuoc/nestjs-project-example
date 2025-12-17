import { Global, Module, DynamicModule } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ILogger } from './logger.interface';
import { LoggerConfig } from './logger.config';

/**
 * Logger Module
 *
 * Provides structured logging service globally
 */
@Global()
@Module({})
export class LoggerModule {
  /**
   * Register logger module with configuration
   */
  static forRoot(config?: LoggerConfig): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: () => {
            return new LoggerService(config);
          },
        },
        {
          provide: 'ILogger',
          useExisting: LoggerService,
        },
      ],
      exports: [LoggerService, 'ILogger'],
    };
  }
}
