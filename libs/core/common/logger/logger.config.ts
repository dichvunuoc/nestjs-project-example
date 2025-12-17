/**
 * Logger Configuration
 */
export interface LoggerConfig {
  /**
   * Log level (trace, debug, info, warn, error, fatal)
   * @default 'info'
   */
  level?: string;

  /**
   * Enable pretty printing (for development)
   * @default false
   */
  prettyPrint?: boolean;

  /**
   * Enable redaction of sensitive fields
   * @default ['password', 'token', 'secret', 'authorization']
   */
  redact?: string[];
}
