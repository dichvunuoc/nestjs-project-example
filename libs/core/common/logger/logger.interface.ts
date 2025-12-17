/**
 * Logger Interface (Abstraction Layer)
 *
 * Provides abstraction for logging to allow different implementations
 * (Pino, Winston, etc.) without coupling to specific library
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LoggerContext {
  [key: string]: any;
}

export interface ILogger {
  /**
   * Log trace message
   */
  trace(message: string, context?: LoggerContext): void;

  /**
   * Log debug message
   */
  debug(message: string, context?: LoggerContext): void;

  /**
   * Log info message
   */
  info(message: string, context?: LoggerContext): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: LoggerContext): void;

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LoggerContext): void;

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error | unknown, context?: LoggerContext): void;

  /**
   * Create child logger with context
   */
  child(context: LoggerContext): ILogger;

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void;
}
