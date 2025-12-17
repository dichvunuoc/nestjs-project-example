/**
 * Logger Interface
 * 
 * Abstraction cho logging service để có thể swap implementations
 * (Pino, Winston, etc.)
 */
export interface ILogger {
  /**
   * Log info message
   */
  log(message: string, context?: string, meta?: Record<string, any>): void;

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: string, meta?: Record<string, any>): void;

  /**
   * Log debug message
   */
  debug(message: string, context?: string, meta?: Record<string, any>): void;

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string, meta?: Record<string, any>): void;

  /**
   * Set context (correlation ID, user ID, etc.)
   */
  setContext(context: Record<string, any>): void;

  /**
   * Get current context
   */
  getContext(): Record<string, any>;
}
