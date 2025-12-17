/**
 * Logger Interface
 * 
 * Abstraction cho logging để có thể swap implementations
 * (Pino, Winston, etc.)
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  [key: string]: any;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: `x-${string}`]: any; // Allow custom context fields
}

export interface ILogger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
  fatal(message: string, error?: Error | unknown, context?: LogContext): void;
  
  /**
   * Create child logger với additional context
   */
  child(context: LogContext): ILogger;
  
  /**
   * Set correlation ID cho current request
   */
  setCorrelationId(correlationId: string): void;
  
  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined;
}
