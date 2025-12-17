import { Injectable, Inject, Optional } from '@nestjs/common';
import { ILogger } from './logger.interface';
import { PinoLoggerService } from './pino-logger.service';

/**
 * Logger Service Token
 */
export const LOGGER_TOKEN = Symbol('ILogger');

/**
 * Logger Service
 * Provides logging functionality throughout the application
 * Uses dependency injection to allow swapping implementations
 */
@Injectable()
export class LoggerService {
  constructor(
    @Inject(LOGGER_TOKEN) @Optional() private readonly logger?: ILogger,
  ) {
    // Fallback to PinoLoggerService if no logger provided
    if (!this.logger) {
      this.logger = new PinoLoggerService();
    }
  }

  /**
   * Get logger instance
   */
  getLogger(): ILogger {
    return this.logger!;
  }

  /**
   * Create child logger with context
   */
  createChild(context: Record<string, any>): ILogger {
    return this.logger!.child(context);
  }

  /**
   * Log error
   */
  error(message: string, ...args: any[]): void;
  error(error: Error, message?: string, ...args: any[]): void;
  error(messageOrError: string | Error, ...args: any[]): void {
    if (messageOrError instanceof Error) {
      this.logger!.error(messageOrError, ...args);
    } else {
      this.logger!.error(messageOrError, ...args);
    }
  }

  /**
   * Log warning
   */
  warn(message: string, ...args: any[]): void {
    this.logger!.warn(message, ...args);
  }

  /**
   * Log info
   */
  info(message: string, ...args: any[]): void {
    this.logger!.info(message, ...args);
  }

  /**
   * Log debug
   */
  debug(message: string, ...args: any[]): void {
    this.logger!.debug(message, ...args);
  }

  /**
   * Log verbose
   */
  verbose(message: string, ...args: any[]): void {
    this.logger!.verbose(message, ...args);
  }
}
