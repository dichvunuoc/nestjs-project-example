import { Injectable, Inject, Optional } from '@nestjs/common';
import pino, { Logger as PinoLogger, LoggerOptions, Level } from 'pino';
import prettyTransport from 'pino-pretty';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';

/**
 * Log levels mapped to Pino levels
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Structured Log Entry interface
 */
export interface StructuredLogEntry {
  message: string;
  level?: LogLevel;
  error?: Error;
  data?: Record<string, any>;
  metadata?: {
    service?: string;
    version?: string;
    environment?: string;
    instanceId?: string;
    [key: string]: any;
  };
  operation?: {
    name?: string;
    type?: string;
    duration?: number;
    [key: string]: any;
  };
  user?: {
    id?: string;
    email?: string;
    roles?: string[];
    [key: string]: any;
  };
  trace?: {
    id?: string;
    correlationId?: string;
    spanId?: string;
    [key: string]: any;
  };
  business?: {
    entity?: string;
    entityId?: string;
    action?: string;
    [key: string]: any;
  };
  failureType?: string;
  duration?: number;
  attempt?: number;
  degraded?: boolean;
  originalError?: any;
}

/**
 * Structured Logger Service
 *
 * Provides structured logging with correlation ID propagation,
 * automatic context injection, and Pino-based high-performance logging.
 *
 * Features:
 * - JSON-structured logs for easy parsing
 * - Automatic correlation ID from request context
 * - Performance logging with duration
 * - Error tracking with stack traces
 * - Business context logging
 * - Multiple transports (console, file, external)
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class ProductService {
 *   constructor(
 *     private readonly logger: StructuredLogger,
 *   ) {}
 *
 *   async createProduct(command: CreateProductCommand) {
 *     this.logger.info('Creating product', {
 *       operation: { name: 'CreateProduct' },
 *       business: { entity: 'Product', action: 'create' },
 *       data: { name: command.name },
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class StructuredLogger {
  private readonly logger: PinoLogger;
  private readonly serviceInfo: {
    service: string;
    version: string;
    environment: string;
    instanceId: string;
  };

  constructor(
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
    config?: {
      serviceName?: string;
      serviceVersion?: string;
      environment?: string;
      logLevel?: Level;
      prettyPrint?: boolean;
      redactKeys?: string[];
    },
  ) {
    // Service information
    this.serviceInfo = {
      service:
        config?.serviceName || process.env.SERVICE_NAME || 'nestjs-ddd-api',
      version: config?.serviceVersion || process.env.SERVICE_VERSION || '1.0.0',
      environment: config?.environment || process.env.NODE_ENV || 'development',
      instanceId: `${process.env.SERVICE_NAME || 'app'}-${process.pid}`,
    };

    // Configure Pino logger
    const pinoConfig: LoggerOptions = {
      level: config?.logLevel || process.env.LOG_LEVEL || 'info',
      // Add service information to all logs
      base: {
        ...this.serviceInfo,
        pid: process.pid,
        hostname: require('os').hostname(),
      },
      // Redact sensitive fields
      redact: config?.redactKeys || [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'user.password',
        'user.token',
        'data.password',
        'data.token',
      ],
      // Add timestamp
      timestamp: pino.stdTimeFunctions.isoTime,
      // Formatters
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
          // Ensure consistent structure
          return {
            ...object,
            '@timestamp': object.timestamp,
            '@version': '1',
          };
        },
      },
    };

    // Add pretty print for development
    if (
      config?.prettyPrint !== false &&
      this.serviceInfo.environment === 'development' &&
      process.env.ENABLE_PRETTY_LOGGING === 'true'
    ) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          messageFormat: '{operation?.name || "Request"} - {msg}',
        },
      };
    }

    this.logger = pino(pinoConfig);
  }

  /**
   * Log at TRACE level
   */
  trace(message: string, entry?: Partial<StructuredLogEntry>): void {
    this.log(LogLevel.TRACE, message, entry);
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, entry?: Partial<StructuredLogEntry>): void {
    this.log(LogLevel.DEBUG, message, entry);
  }

  /**
   * Log at INFO level
   */
  info(message: string, entry?: Partial<StructuredLogEntry>): void {
    this.log(LogLevel.INFO, message, entry);
  }

  /**
   * Log at WARN level
   */
  warn(message: string, entry?: Partial<StructuredLogEntry>): void {
    this.log(LogLevel.WARN, message, entry);
  }

  /**
   * Log at ERROR level
   */
  error(
    message: string,
    error?: Error,
    entry?: Partial<StructuredLogEntry>,
  ): void {
    this.log(LogLevel.ERROR, message, { ...entry, error });
  }

  /**
   * Log at FATAL level
   */
  fatal(
    message: string,
    error?: Error,
    entry?: Partial<StructuredLogEntry>,
  ): void {
    this.log(LogLevel.FATAL, message, { ...entry, error });
  }

  /**
   * Log operation start
   */
  logOperationStart(operationName: string, data?: Record<string, any>): void {
    this.info(`Starting operation: ${operationName}`, {
      operation: {
        name: operationName,
        phase: 'start',
        startTime: Date.now(),
      },
      data,
    });
  }

  /**
   * Log operation completion
   */
  logOperationEnd(
    operationName: string,
    startTime: number,
    result?: any,
    error?: Error,
  ): void {
    const duration = Date.now() - startTime;
    const level = error ? LogLevel.ERROR : LogLevel.INFO;

    this.log(level, `Completed operation: ${operationName}`, {
      operation: {
        name: operationName,
        phase: 'end',
        duration,
        startTime,
        endTime: Date.now(),
      },
      data: result,
      error,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): StructuredLogger {
    const childLogger = new StructuredLogger(this.requestContext);
    // Use private property access pattern - create a new instance with the child logger
    Object.assign(childLogger, {
      logger: this.logger.child(context),
      serviceInfo: this.serviceInfo,
    });
    return childLogger;
  }

  /**
   * Get raw Pino logger for advanced usage
   */
  getRawLogger(): PinoLogger {
    return this.logger;
  }

  /**
   * Core logging method with context enrichment
   */
  private log(
    level: LogLevel,
    message: string,
    entry?: Partial<StructuredLogEntry>,
  ): void {
    // Build log entry with automatic context
    const logEntry = this.buildLogEntry(message, entry);

    // Log with Pino
    this.logger[level](logEntry);
  }

  /**
   * Build complete log entry with all context
   */
  private buildLogEntry(
    message: string,
    entry?: Partial<StructuredLogEntry>,
  ): any {
    const baseEntry: StructuredLogEntry = {
      message,
      level: entry?.level || LogLevel.INFO,
      metadata: {
        ...this.serviceInfo,
        ...entry?.metadata,
      },
    };

    // Add request context if available
    const requestContext = this.requestContext?.current();
    if (requestContext) {
      baseEntry.trace = {
        id: requestContext.correlationId,
        correlationId: requestContext.correlationId,
        causationId: requestContext.causationId,
        userId: requestContext.userId,
        ...entry?.trace,
      };

      // Add user context
      if (requestContext.userId) {
        baseEntry.user = {
          id: requestContext.userId,
          ...entry?.user,
        };
      }
    }

    // Merge with provided entry
    return this.mergeLogEntries(baseEntry, entry);
  }

  /**
   * Merge log entries with proper precedence
   */
  private mergeLogEntries(
    base: StructuredLogEntry,
    override?: Partial<StructuredLogEntry>,
  ): any {
    if (!override) return base;

    return {
      ...base.metadata,
      ...override,
      message: base.message,
      level: base.level,
      metadata: {
        ...base.metadata,
        ...override.metadata,
      },
      operation: {
        ...base.operation,
        ...override.operation,
      },
      user: {
        ...base.user,
        ...override.user,
      },
      trace: {
        ...base.trace,
        ...override.trace,
      },
      business: {
        ...base.business,
        ...override.business,
      },
    };
  }

  /**
   * Allow overriding the logger instance for child loggers
   */
  private setLoggerInstance(logger: PinoLogger) {
    (this as any).logger = logger;
  }
}
