/**
 * Retry Policy Types
 */
export enum RetryPolicyType {
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
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Retry policy type
   * @default RetryPolicyType.EXPONENTIAL
   */
  policy?: RetryPolicyType;

  /**
   * Multiplier for exponential/linear backoff
   * @default 2
   */
  multiplier?: number;

  /**
   * Function to determine if error should be retried
   */
  shouldRetry?: (error: Error) => boolean;

  /**
   * Function called on each retry attempt
   */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retry Statistics
 */
export interface RetryStats {
  attempts: number;
  lastError?: Error;
  lastAttemptTime?: Date;
}
