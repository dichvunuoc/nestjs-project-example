import { SetMetadata } from '@nestjs/common';
import { RetryOptions } from './retry.interface';

export const RETRY_KEY = 'retry';

/**
 * Retry Decorator
 * 
 * Apply retry logic to a method
 * 
 * @example
 * ```typescript
 * @Retry({ maxRetries: 3, strategy: RetryStrategy.EXPONENTIAL })
 * async callExternalApi() {
 *   return this.httpClient.get('/api/data');
 * }
 * ```
 */
export const Retry = (options?: RetryOptions) =>
  SetMetadata(RETRY_KEY, options || {});
