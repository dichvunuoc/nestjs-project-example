/**
 * Logger Interface
 * Abstraction for logging functionality
 * Allows swapping implementations (Pino, Winston, etc.)
 */
export interface ILogger {
  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void;
  error(error: Error, message?: string, ...args: any[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log info message
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log verbose message
   */
  verbose(message: string, ...args: any[]): void;

  /**
   * Create child logger with context
   */
  child(context: Record<string, any>): ILogger;

  /**
   * Set log level
   */
  setLogLevels?(levels: string[]): void;
}

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}
