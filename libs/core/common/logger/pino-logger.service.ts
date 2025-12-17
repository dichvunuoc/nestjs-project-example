import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { ILogger, LogLevel } from './logger.interface';

/**
 * Pino Logger Service Implementation
 * Provides structured JSON logging for production
 *
 * Features:
 * - Structured JSON logs
 * - Log levels: error, warn, info, debug
 * - Child loggers with context
 * - Request correlation ID support
 * - Performance optimized (async logging)
 */
@Injectable()
export class PinoLoggerService implements ILogger, LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const logLevel = (process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')).toLowerCase();

    // Configure Pino logger
    this.logger = pino({
      level: logLevel,
      ...(isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }), // Production: use JSON format (no transport)
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      // Redact sensitive information
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'token',
          'secret',
          'apiKey',
        ],
        remove: true,
      },
    });
  }

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void;
  error(error: Error, message?: string, ...args: any[]): void;
  error(messageOrError: string | Error, ...args: any[]): void {
    if (messageOrError instanceof Error) {
      const [message, ...rest] = args;
      this.logger.error(
        {
          err: {
            name: messageOrError.name,
            message: messageOrError.message,
            stack: messageOrError.stack,
          },
          ...(message && { msg: message }),
        },
        ...rest,
      );
    } else {
      this.logger.error({ msg: messageOrError }, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    this.logger.warn({ msg: message }, ...args);
  }

  /**
   * Log info message
   */
  info(message: string, ...args: any[]): void {
    this.logger.info({ msg: message }, ...args);
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void {
    this.logger.debug({ msg: message }, ...args);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, ...args: any[]): void {
    this.logger.trace({ msg: message }, ...args);
  }

  /**
   * Create child logger with context
   * Useful for adding request ID, user ID, etc.
   */
  child(context: Record<string, any>): ILogger {
    const childLogger = this.logger.child(context);
    return {
      error: (msgOrErr: string | Error, ...args: any[]) => {
        if (msgOrErr instanceof Error) {
          const [message, ...rest] = args;
          childLogger.error(
            {
              err: {
                name: msgOrErr.name,
                message: msgOrErr.message,
                stack: msgOrErr.stack,
              },
              ...(message && { msg: message }),
            },
            ...rest,
          );
        } else {
          childLogger.error({ msg: msgOrErr }, ...args);
        }
      },
      warn: (msg: string, ...args: any[]) => childLogger.warn({ msg }, ...args),
      info: (msg: string, ...args: any[]) => childLogger.info({ msg }, ...args),
      debug: (msg: string, ...args: any[]) => childLogger.debug({ msg }, ...args),
      verbose: (msg: string, ...args: any[]) => childLogger.trace({ msg }, ...args),
      child: (ctx: Record<string, any>) => {
        const nestedChild = childLogger.child(ctx);
        return this.createChildLogger(nestedChild);
      },
    };
  }

  /**
   * Helper to create child logger from Pino logger
   */
  private createChildLogger(pinoLogger: pino.Logger): ILogger {
    return {
      error: (msgOrErr: string | Error, ...args: any[]) => {
        if (msgOrErr instanceof Error) {
          const [message, ...rest] = args;
          pinoLogger.error(
            {
              err: {
                name: msgOrErr.name,
                message: msgOrErr.message,
                stack: msgOrErr.stack,
              },
              ...(message && { msg: message }),
            },
            ...rest,
          );
        } else {
          pinoLogger.error({ msg: msgOrErr }, ...args);
        }
      },
      warn: (msg: string, ...args: any[]) => pinoLogger.warn({ msg }, ...args),
      info: (msg: string, ...args: any[]) => pinoLogger.info({ msg }, ...args),
      debug: (msg: string, ...args: any[]) => pinoLogger.debug({ msg }, ...args),
      verbose: (msg: string, ...args: any[]) => pinoLogger.trace({ msg }, ...args),
      child: (ctx: Record<string, any>) => this.createChildLogger(pinoLogger.child(ctx)),
    };
  }

  /**
   * Set log levels (for compatibility with NestJS LoggerService)
   */
  setLogLevels?(levels: string[]): void {
    // Pino doesn't support dynamic log levels per category
    // This is kept for compatibility
  }

  /**
   * Get underlying Pino logger instance
   */
  getPinoLogger(): pino.Logger {
    return this.logger;
  }
}
