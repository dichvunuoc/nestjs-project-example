import { SetMetadata } from '@nestjs/common';
import { RetryOptions } from './retry.interface';

/**
 * Retry Metadata Key
 */
export const RETRY_METADATA = 'retry';

/**
 * Retry Decorator
 * Apply retry logic to a method
 *
 * @example
 * ```typescript
 * @Retry({ maxAttempts: 3, strategy: RetryStrategy.EXPONENTIAL })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 */
export const Retry = (options?: RetryOptions) => {
  return SetMetadata(RETRY_METADATA, options || {});
};
