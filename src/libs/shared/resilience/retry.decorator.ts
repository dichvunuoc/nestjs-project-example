import {
  Injectable,
  SetMetadata,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RETRY_CONFIG_TOKEN } from './constants';

/**
 * Retry Configuration
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds
   */
  maxDelayMs?: number;

  /**
   * Backoff multiplier for exponential backoff
   */
  backoffMultiplier?: number;

  /**
   * Jitter factor for randomness (0-1)
   */
  jitterFactor?: number;

  /**
   * Custom retry condition function
   * Return true to retry, false to stop
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;

  /**
   * Function to calculate delay for each attempt
   */
  delayCalculator?: (attempt: number, error: Error) => number;

  /**
   * Types of errors to retry
   */
  retryableErrors?: string[];

  /**
   * Types of errors to NOT retry
   */
  nonRetryableErrors?: string[];

  /**
   * Whether to log retry attempts
   */
  logAttempts?: boolean;

  /**
   * Custom logger instance
   */
  logger?: Logger;
}

/**
 * Retry metadata key
 */
export const RETRY_KEY = 'retry';

/**
 * Retry Decorator
 *
 * Automatically retries failed operations with configurable backoff strategies.
 * Supports exponential backoff, jitter, and custom retry conditions.
 *
 * Usage:
 * ```typescript
 * @Retry({
 *   maxAttempts: 3,
 *   initialDelayMs: 1000,
 *   backoffMultiplier: 2,
 *   jitterFactor: 0.1,
 * })
 * async callExternalAPI(data: any): Promise<any> {
 *   // Will retry up to 3 times with exponential backoff
 * }
 *
 * @Retry({
 *   maxAttempts: 5,
 *   shouldRetry: (error) => error.status >= 500,
 *   retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT'],
 * })
 * async unreliableOperation(): Promise<any> {
 *   // Only retry on network errors and 5xx responses
 * }
 *
 * @Retry({
 *   maxAttempts: 2,
 *   delayCalculator: (attempt) => Math.random() * 1000,
 * })
 * async randomBackoffOperation(): Promise<any> {
 *   // Custom random delay between attempts
 * }
 * ```
 */
export const Retry = (options: RetryOptions) => SetMetadata(RETRY_KEY, options);

/**
 * Retry Service
 *
 * Manages retry logic with various backoff strategies.
 * Handles jitter, exponential backoff, and custom retry conditions.
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(RETRY_CONFIG_TOKEN)
    private readonly globalConfig?: Partial<RetryOptions>,
  ) {}

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    target: any,
    propertyKey: string,
    args: any[],
    options?: RetryOptions,
  ): Promise<T> {
    const mergedOptions = this.mergeOptions(options);
    const logger = mergedOptions.logger || this.logger;

    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= mergedOptions.maxAttempts; attempt++) {
      try {
        if (attempt > 1 && mergedOptions.logAttempts !== false) {
          logger.log(
            `Retry attempt ${attempt}/${mergedOptions.maxAttempts} for ${this.getExecutionName(target, propertyKey)}`,
          );
        }

        // Execute the function
        const result = await target[propertyKey].apply(target, args);

        // Success on retry
        if (attempt > 1 && mergedOptions.logAttempts !== false) {
          logger.log(
            `Retry successful on attempt ${attempt} for ${this.getExecutionName(target, propertyKey)}`,
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (!this.shouldRetry(lastError, attempt, mergedOptions)) {
          break;
        }

        // Don't wait after the last attempt
        if (attempt < mergedOptions.maxAttempts) {
          const delay = this.calculateDelay(attempt, lastError, mergedOptions);
          totalDelay += delay;

          if (mergedOptions.logAttempts !== false) {
            logger.warn(
              `Retry attempt ${attempt} failed for ${this.getExecutionName(target, propertyKey)}. ` +
                `Retrying in ${delay}ms. Error: ${lastError.message}`,
            );
          }

          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (mergedOptions.logAttempts !== false) {
      logger.error(
        `All ${mergedOptions.maxAttempts} retry attempts exhausted for ${this.getExecutionName(target, propertyKey)}. ` +
          `Total delay: ${totalDelay}ms. Last error: ${lastError!.message}`,
      );
    }

    throw lastError!;
  }

  /**
   * Merge provided options with global defaults
   */
  private mergeOptions(options?: RetryOptions): Required<RetryOptions> {
    const defaults: Required<RetryOptions> = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      shouldRetry: () => true,
      delayCalculator: () => 1000,
      retryableErrors: [],
      nonRetryableErrors: [],
      logAttempts: true,
      logger: this.logger,
    };

    return {
      ...defaults,
      ...this.globalConfig,
      ...options,
    };
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(
    error: Error,
    attempt: number,
    options: Required<RetryOptions>,
  ): boolean {
    // Don't retry if this is the last attempt
    if (attempt >= options.maxAttempts) {
      return false;
    }

    // Check custom retry condition
    if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
      return false;
    }

    // Check non-retryable errors first
    if (options.nonRetryableErrors?.length) {
      for (const nonRetryableError of options.nonRetryableErrors) {
        if (
          error.name === nonRetryableError ||
          error.constructor.name === nonRetryableError ||
          error.message.includes(nonRetryableError)
        ) {
          return false;
        }
      }
    }

    // Check retryable errors
    if (options.retryableErrors?.length) {
      for (const retryableError of options.retryableErrors) {
        if (
          error.name === retryableError ||
          error.constructor.name === retryableError ||
          error.message.includes(retryableError)
        ) {
          return true;
        }
      }
      // If retryable errors specified and none match, don't retry
      return false;
    }

    // Default retry conditions
    return this.isRetryableError(error);
  }

  /**
   * Default retryable error check
   */
  private isRetryableError(error: Error): boolean {
    // Don't retry authentication/authorization errors
    if (
      error.name === 'UnauthorizedError' ||
      error.name === 'ForbiddenError' ||
      error.message.includes('401') ||
      error.message.includes('403')
    ) {
      return false;
    }

    // Don't retry validation errors
    if (
      error.name === 'ValidationError' ||
      error.name === 'BadRequestException' ||
      error.message.includes('400') ||
      error.message.includes('validation')
    ) {
      return false;
    }

    // Don't retry not found errors
    if (error.name === 'NotFoundException' || error.message.includes('404')) {
      return false;
    }

    // Retry network and server errors
    return (
      error.name === 'ECONNREFUSED' ||
      error.name === 'ETIMEDOUT' ||
      error.name === 'ENOTFOUND' ||
      error.name === 'ECONNRESET' ||
      error.message.includes('timeout') ||
      error.message.includes('connection') ||
      error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')
    );
  }

  /**
   * Calculate delay for next attempt
   */
  private calculateDelay(
    attempt: number,
    error: Error,
    options: Required<RetryOptions>,
  ): number {
    // Use custom delay calculator if provided
    if (options.delayCalculator) {
      return options.delayCalculator(attempt, error);
    }

    // Exponential backoff with jitter
    const baseDelay =
      options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(baseDelay, options.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (options.jitterFactor > 0) {
      const jitter = cappedDelay * options.jitterFactor * Math.random();
      return Math.floor(cappedDelay + jitter);
    }

    return Math.floor(cappedDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution name for logging
   */
  private getExecutionName(target: any, propertyKey: string): string {
    const className = target.constructor?.name || 'Unknown';
    return `${className}.${propertyKey}`;
  }
}

/**
 * Retry Interceptor
 *
 * Automatically applies retry logic to decorated methods.
 * Works with the RetryService to handle transient failures.
 */
export class RetryInterceptor {
  constructor(
    private readonly retryService: RetryService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: any, next: any): Promise<any> {
    // Get retry options from metadata
    const options =
      this.reflector.get<RetryOptions>(RETRY_KEY, context.getHandler()) ||
      this.reflector.get<RetryOptions>(RETRY_KEY, context.getClass());

    if (!options) {
      return next.handle(); // No retry configured
    }

    // Get target and method
    const target = context.getInstance();
    const propertyKey = context.getHandlerName();
    const args = context.getArgs();

    // Execute with retry
    return this.retryService.execute(target, propertyKey, args, options);
  }
}

/**
 * Common Retry Configurations
 */
export const RetryConfigs = {
  /**
   * For external API calls with typical network issues
   */
  ExternalAPI: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
  },

  /**
   * For database operations with connection issues
   */
  Database: {
    maxAttempts: 2,
    initialDelayMs: 500,
    backoffMultiplier: 1.5,
    jitterFactor: 0.2,
    shouldRetry: (error: Error) => {
      return (
        error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('deadlock')
      );
    },
  },

  /**
   * For message queue operations
   */
  MessageQueue: {
    maxAttempts: 5,
    initialDelayMs: 2000,
    backoffMultiplier: 2,
    maxDelayMs: 60000,
    jitterFactor: 0.3,
    nonRetryableErrors: ['ValidationError', 'SerializationError'],
  },

  /**
   * For file operations with temporary failures
   */
  FileSystem: {
    maxAttempts: 3,
    initialDelayMs: 100,
    backoffMultiplier: 2,
    retryableErrors: ['EBUSY', 'EMFILE', 'ENFILE'],
  },

  /**
   * Aggressive retry for critical operations
   */
  Aggressive: {
    maxAttempts: 10,
    initialDelayMs: 100,
    backoffMultiplier: 1.2,
    maxDelayMs: 10000,
    jitterFactor: 0.5,
  },

  /**
   * Conservative retry for sensitive operations
   */
  Conservative: {
    maxAttempts: 2,
    initialDelayMs: 2000,
    backoffMultiplier: 1,
    nonRetryableErrors: ['Error'], // Only retry on specific errors
  },
} as const;
