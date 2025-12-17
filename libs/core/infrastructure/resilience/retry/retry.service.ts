import { Injectable, Logger } from '@nestjs/common';
import { IRetryService, RetryOptions } from './retry.interface';

/**
 * Retry Service
 * 
 * Implements retry logic với exponential backoff
 * 
 * Usage:
 * ```typescript
 * const result = await retryService.execute(
 *   () => httpClient.get('/api/data'),
 *   { maxAttempts: 3, delay: 1000, backoff: 'exponential' }
 * );
 * ```
 */
@Injectable()
export class RetryService implements IRetryService {
  private readonly logger = new Logger(RetryService.name);

  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 'exponential',
      maxDelay = 10000,
      shouldRetry = () => true,
      onRetry,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Check if should retry
        if (!shouldRetry(lastError, attempt)) {
          this.logger.debug(
            `Retry aborted for error: ${lastError.message}`,
          );
          throw lastError;
        }

        // If this was the last attempt, throw error
        if (attempt >= maxAttempts) {
          this.logger.warn(
            `Max retry attempts (${maxAttempts}) reached. Last error: ${lastError.message}`,
          );
          throw lastError;
        }

        // Calculate delay
        const calculatedDelay = this.calculateDelay(
          delay,
          attempt,
          backoff,
          maxDelay,
        );

        // Call onRetry callback
        if (onRetry) {
          onRetry(lastError, attempt, calculatedDelay);
        }

        this.logger.debug(
          `Retry attempt ${attempt}/${maxAttempts} after ${calculatedDelay}ms. Error: ${lastError.message}`,
        );

        // Wait before retry
        await this.sleep(calculatedDelay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay based on backoff strategy
   */
  private calculateDelay(
    baseDelay: number,
    attempt: number,
    backoff: RetryOptions['backoff'],
    maxDelay: number,
  ): number {
    let delay: number;

    switch (backoff) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = baseDelay;
        break;
    }

    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
