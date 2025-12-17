import { Injectable, Logger } from '@nestjs/common';
import {
  RetryOptions,
  RetryPolicyType,
  RetryStats,
} from './retry.interface';

/**
 * Retry Service
 *
 * Implements retry logic with configurable policies
 * Supports exponential backoff, fixed delay, and linear backoff
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T> {
    const opts: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> & {
      shouldRetry?: (error: Error) => boolean;
      onRetry?: (error: Error, attempt: number) => void;
    } = {
      maxAttempts: options?.maxAttempts || 3,
      initialDelay: options?.initialDelay || 1000,
      maxDelay: options?.maxDelay || 30000,
      policy: options?.policy || RetryPolicyType.EXPONENTIAL,
      multiplier: options?.multiplier || 2,
      shouldRetry: options?.shouldRetry,
      onRetry: options?.onRetry,
    };

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < opts.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if should retry
        if (opts.shouldRetry && !opts.shouldRetry(lastError)) {
          throw lastError;
        }

        // If last attempt, throw error
        if (attempt >= opts.maxAttempts) {
          this.logger.error(
            `Retry failed after ${attempt} attempts: ${lastError.message}`,
          );
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, opts);

        // Call onRetry callback
        if (opts.onRetry) {
          opts.onRetry(lastError, attempt);
        }

        this.logger.warn(
          `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms: ${lastError.message}`,
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay based on policy
   */
  private calculateDelay(
    attempt: number,
    options: Required<
      Pick<
        RetryOptions,
        'initialDelay' | 'maxDelay' | 'policy' | 'multiplier'
      >
    >,
  ): number {
    let delay: number;

    switch (options.policy) {
      case RetryPolicyType.EXPONENTIAL:
        delay = options.initialDelay * Math.pow(options.multiplier, attempt - 1);
        break;
      case RetryPolicyType.LINEAR:
        delay = options.initialDelay * (attempt - 1) * options.multiplier;
        break;
      case RetryPolicyType.FIXED:
      default:
        delay = options.initialDelay;
        break;
    }

    return Math.min(delay, options.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
