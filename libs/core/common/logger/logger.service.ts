import { Injectable, Scope } from '@nestjs/common';
import { ILogger } from './logger.interface';

/**
 * Structured Logger Service
 * 
 * Sử dụng Pino cho structured logging (JSON format)
 * Production-ready với:
 * - Structured JSON logs
 * - Log levels
 * - Context (correlation ID, user ID, etc.)
 * - Performance optimized
 * 
 * Note: Pino is already included in Fastify, but we wrap it for consistency
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements ILogger {
  private context: Record<string, any> = {};
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Log info message
   */
  log(message: string, context?: string, meta?: Record<string, any>): void {
    this.writeLog('info', message, context, meta);
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void {
    this.writeLog('error', message, context, { ...meta, trace });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, meta?: Record<string, any>): void {
    this.writeLog('warn', message, context, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.writeLog('debug', message, context, meta);
    }
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.writeLog('verbose', message, context, meta);
    }
  }

  /**
   * Set context (correlation ID, user ID, etc.)
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): Record<string, any> {
    return { ...this.context };
  }

  /**
   * Write structured log
   */
  private writeLog(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    contextName?: string,
    meta?: Record<string, any>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(contextName && { context: contextName }),
      ...this.context,
      ...meta,
    };

    // In production, output JSON for log aggregation systems (ELK, Loki, etc.)
    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
      return;
    }

    // In development, pretty print for readability
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}]`;
    const contextStr = contextName ? `[${contextName}]` : '';
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const contextMetaStr = Object.keys(this.context).length > 0 ? ` ${JSON.stringify(this.context)}` : '';

    console.log(`${prefix}${contextStr} ${message}${contextMetaStr}${metaStr}`);
  }
}
