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
   * Initial delay between retries (ms)
   * @default 1000
   */
  delay?: number;

  /**
   * Backoff strategy
   * - 'fixed': Same delay between retries
   * - 'exponential': Exponential backoff (delay * 2^attempt)
   * - 'linear': Linear backoff (delay * attempt)
   * @default 'exponential'
   */
  backoff?: 'fixed' | 'exponential' | 'linear';

  /**
   * Maximum delay between retries (ms)
   * @default 10000
   */
  maxDelay?: number;

  /**
   * Function to determine if error should be retried
   * Return true to retry, false to fail immediately
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;

  /**
   * Function called before each retry
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Retry Service Interface
 */
export interface IRetryService {
  /**
   * Execute function with retry logic
   */
  execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T>;
}
