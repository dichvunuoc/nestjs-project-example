import { SetMetadata } from '@nestjs/common';
import { RetryOptions } from './retry.interface';

/**
 * Retry Decorator Metadata Key
 */
export const RETRY_OPTIONS_KEY = 'retry:options';

/**
 * Retry Decorator
 * 
 * Apply retry logic to method
 * 
 * Usage:
 * ```typescript
 * @Retryable({ maxAttempts: 3, delay: 1000 })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 * 
 * Note: Requires RetryInterceptor to be applied
 */
export const Retryable = (options?: RetryOptions) =>
  SetMetadata(RETRY_OPTIONS_KEY, options || {});
