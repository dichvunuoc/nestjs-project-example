import { Injectable, LoggerService as NestLoggerService, Optional } from '@nestjs/common';
import { ILogger, LogContext, LogLevel } from './logger.interface';

/**
 * Structured Logger Service
 * 
 * Wraps NestJS Logger với structured logging support
 * Sử dụng Pino hoặc Winston trong production
 * Falls back to NestJS Logger trong development
 */
@Injectable()
export class StructuredLoggerService implements ILogger, NestLoggerService {
  private correlationId?: string;
  private context: LogContext = {};

  constructor(@Optional() private readonly logger?: NestLoggerService) {
    // Use NestJS Logger as default if no logger provided
    if (!this.logger) {
      this.logger = new (require('@nestjs/common').Logger)(StructuredLoggerService.name);
    }
  }

  /**
   * Log với structured format (internal method)
   */
  private writeLog(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const logContext: LogContext = {
      ...this.context,
      ...context,
      timestamp: new Date().toISOString(),
      level,
    };

    if (this.correlationId) {
      logContext.correlationId = this.correlationId;
    }

    if (error) {
      logContext.error = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }

    // Format as JSON trong production, readable trong development
    const isProduction = process.env.NODE_ENV === 'production';
    const logMessage = isProduction
      ? JSON.stringify({ message, ...logContext })
      : this.formatReadable(level, message, logContext);

    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        this.logger.debug?.(logMessage);
        break;
      case LogLevel.INFO:
        this.logger.log(logMessage);
        break;
      case LogLevel.WARN:
        this.logger.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.logger.error(logMessage, error?.stack);
        break;
    }
  }

  /**
   * Log với structured format (public method for ILogger interface)
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    this.writeLog(level, message, context, error);
  }

  /**
   * Format readable log cho development
   */
  private formatReadable(level: LogLevel, message: string, context: LogContext): string {
    const contextStr = Object.keys(context)
      .filter(key => !['message', 'level', 'timestamp'].includes(key))
      .map(key => `${key}=${JSON.stringify(context[key])}`)
      .join(' ');

    return `[${level.toUpperCase()}] ${message}${contextStr ? ` ${contextStr}` : ''}`;
  }

  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void;
  error(message: any, trace?: string, context?: string): void;
  error(message: any, traceOrError?: string | Error | unknown, context?: string | LogContext): void {
    // Handle both ILogger interface và NestJS LoggerService interface
    if (typeof message === 'string' && typeof traceOrError === 'string' && typeof context === 'string') {
      // NestJS LoggerService interface
      this.writeLog(LogLevel.ERROR, String(message), { context }, traceOrError ? new Error(traceOrError) : undefined);
    } else if (typeof message === 'string') {
      // ILogger interface
      const err = traceOrError instanceof Error ? traceOrError : traceOrError ? new Error(String(traceOrError)) : undefined;
      const ctx = typeof context === 'object' ? context : context ? { context: String(context) } : undefined;
      this.writeLog(LogLevel.ERROR, message, ctx, err);
    } else {
      // Fallback
      this.writeLog(LogLevel.ERROR, String(message), undefined, traceOrError instanceof Error ? traceOrError : undefined);
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.log(LogLevel.FATAL, message, context, err);
  }

  child(context: LogContext): ILogger {
    const childLogger = new StructuredLoggerService(this.logger);
    childLogger.context = { ...this.context, ...context };
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    this.context.correlationId = correlationId;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  // NestJS LoggerService interface methods
  // These have same names as ILogger methods but different signatures
  // TypeScript method overloading will distinguish based on parameter types
  log(message: any, context?: string): void {
    this.writeLog(LogLevel.INFO, String(message), context ? { context } : undefined);
  }

  warn(message: any, context?: string): void {
    this.writeLog(LogLevel.WARN, String(message), context ? { context } : undefined);
  }

  debug(message: any, context?: string): void {
    this.writeLog(LogLevel.DEBUG, String(message), context ? { context } : undefined);
  }

  verbose(message: any, context?: string): void {
    this.writeLog(LogLevel.TRACE, String(message), context ? { context } : undefined);
  }
}
