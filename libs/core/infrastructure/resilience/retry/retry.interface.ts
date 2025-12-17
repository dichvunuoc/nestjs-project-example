/**
 * Retry Strategy
 */
export enum RetryStrategy {
  FIXED = 'fixed',           // Fixed delay
  EXPONENTIAL = 'exponential', // Exponential backoff
  LINEAR = 'linear',         // Linear backoff
}

/**
 * Retry Options
 */
export interface RetryOptions {
  /**
   * Maximum number of retries
   */
  maxRetries?: number;

  /**
   * Initial delay (ms)
   */
  initialDelay?: number;

  /**
   * Maximum delay (ms)
   */
  maxDelay?: number;

  /**
   * Retry strategy
   */
  strategy?: RetryStrategy;

  /**
   * Multiplier cho exponential/linear backoff
   */
  multiplier?: number;

  /**
   * Jitter - randomize delay để tránh thundering herd
   */
  jitter?: boolean;

  /**
   * Function để check if error is retryable
   */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Retry Result
 */
export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDuration: number;
}
