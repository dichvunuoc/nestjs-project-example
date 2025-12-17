import { Injectable, Logger } from '@nestjs/common';
import {
  RetryOptions,
  RetryStrategy,
  RetryResult,
} from './retry.interface';

/**
 * Retry Service
 * 
 * Provides retry mechanism với exponential backoff
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute function với retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<RetryResult<T>> {
    const opts: Required<RetryOptions> = {
      maxRetries: options.maxRetries ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      strategy: options.strategy ?? RetryStrategy.EXPONENTIAL,
      multiplier: options.multiplier ?? 2,
      jitter: options.jitter ?? true,
      isRetryable: options.isRetryable ?? (() => true),
    };

    let lastError: Error | undefined;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await fn();
        return {
          result,
          attempts: attempt + 1,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!opts.isRetryable(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt >= opts.maxRetries) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, opts);

        this.logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
          delay,
        });

        await this.sleep(delay);
      }
    }

    // All retries failed
    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay based on strategy
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    let delay: number;

    switch (options.strategy) {
      case RetryStrategy.FIXED:
        delay = options.initialDelay;
        break;
      case RetryStrategy.LINEAR:
        delay = options.initialDelay * (1 + attempt * options.multiplier);
        break;
      case RetryStrategy.EXPONENTIAL:
      default:
        delay = options.initialDelay * Math.pow(options.multiplier, attempt);
        break;
    }

    // Apply max delay
    delay = Math.min(delay, options.maxDelay);

    // Apply jitter
    if (options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * 2 - 1) * jitterAmount;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
