import { Injectable, Scope } from '@nestjs/common';
import pino from 'pino';
import { ILogger, LogLevel, LoggerContext } from './logger.interface';
import { LoggerConfig } from './logger.config';

/**
 * Structured Logger Service using Pino
 *
 * Provides structured logging with:
 * - JSON format for log aggregation
 * - Context propagation
 * - Log levels
 * - Performance logging
 * - Request/Response logging
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements ILogger {
  protected logger: pino.Logger;
  private context?: LoggerContext;

  constructor(config?: LoggerConfig) {
    const loggerConfig: pino.LoggerOptions = {
      level: config?.level || process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(config?.prettyPrint && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    };

    this.logger = pino(loggerConfig);
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: LoggerContext): void {
    this.context = context;
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: LoggerContext): void {
    this.logger.trace(this.mergeContext(context), message);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LoggerContext): void {
    this.logger.debug(this.mergeContext(context), message);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LoggerContext): void {
    this.logger.info(this.mergeContext(context), message);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LoggerContext): void {
    this.logger.warn(this.mergeContext(context), message);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: LoggerContext,
  ): void {
    const errorContext = this.buildErrorContext(error);
    this.logger.error(
      { ...this.mergeContext(context), ...errorContext },
      message,
    );
  }

  /**
   * Log fatal message
   */
  fatal(
    message: string,
    error?: Error | unknown,
    context?: LoggerContext,
  ): void {
    const errorContext = this.buildErrorContext(error);
    this.logger.fatal(
      { ...this.mergeContext(context), ...errorContext },
      message,
    );
  }

  /**
   * Create child logger with context
   */
  child(context: LoggerContext): ILogger {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger.child(context);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * Merge context with instance context
   */
  private mergeContext(context?: LoggerContext): LoggerContext {
    return { ...this.context, ...context };
  }

  /**
   * Build error context from error object
   */
  private buildErrorContext(error?: Error | unknown): LoggerContext {
    if (!error) {
      return {};
    }

    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    return { error: String(error) };
  }
}
