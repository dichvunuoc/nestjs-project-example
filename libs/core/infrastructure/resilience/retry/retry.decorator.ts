import { SetMetadata } from '@nestjs/common';
import { RetryOptions } from './retry.interface';

export const RETRY_KEY = 'retry';

/**
 * Retry Decorator
 *
 * Apply retry logic to method
 *
 * Usage:
 * ```typescript
 * @Retry({ maxAttempts: 5, policy: RetryPolicyType.EXPONENTIAL })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 */
export const Retry = (options?: RetryOptions) =>
  SetMetadata(RETRY_KEY, options || {});
