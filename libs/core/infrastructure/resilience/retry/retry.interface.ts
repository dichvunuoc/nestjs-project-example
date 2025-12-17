/**
 * Retry Strategy Type
 */
export enum RetryStrategy {
  FIXED = 'FIXED', // Fixed delay between retries
  EXPONENTIAL = 'EXPONENTIAL', // Exponential backoff
  LINEAR = 'LINEAR', // Linear backoff
}

/**
 * Retry Options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds
   */
  maxDelay?: number;

  /**
   * Backoff multiplier (for exponential/linear strategies)
   */
  backoffMultiplier?: number;

  /**
   * Retry strategy
   */
  strategy?: RetryStrategy;

  /**
   * Function to determine if error should be retried
   */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry Statistics
 */
export interface RetryStats {
  attempts: number;
  lastAttemptTime?: Date;
  lastError?: Error;
}
