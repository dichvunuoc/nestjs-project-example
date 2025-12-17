import { Injectable, Logger } from '@nestjs/common';
import { RetryOptions, RetryStrategy, RetryStats } from './retry.interface';

/**
 * Retry Service
 * Provides retry functionality with configurable strategies
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const opts: Required<RetryOptions> = {
      maxAttempts: options.maxAttempts || 3,
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      strategy: options.strategy || RetryStrategy.EXPONENTIAL,
      shouldRetry: options.shouldRetry || (() => true),
    };

    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const result = await fn();
        if (attempt > 1) {
          this.logger.debug(
            `Retry succeeded after ${attempt} attempts`,
          );
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if should retry
        if (!opts.shouldRetry(lastError)) {
          this.logger.debug(
            `Retry aborted: error is not retryable`,
          );
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt >= opts.maxAttempts) {
          this.logger.warn(
            `Retry failed after ${attempt} attempts: ${lastError.message}`,
          );
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, opts);

        this.logger.debug(
          `Retry attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms: ${lastError.message}`,
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay based on strategy
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    switch (options.strategy) {
      case RetryStrategy.FIXED:
        return options.initialDelay;

      case RetryStrategy.LINEAR:
        return Math.min(
          options.initialDelay * attempt * options.backoffMultiplier,
          options.maxDelay,
        );

      case RetryStrategy.EXPONENTIAL:
      default:
        return Math.min(
          options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
          options.maxDelay,
        );
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
