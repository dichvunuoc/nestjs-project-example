import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

/**
 * Circuit Breaker Metadata Key
 */
export const CIRCUIT_BREAKER_METADATA = 'circuit_breaker';

/**
 * Circuit Breaker Decorator
 * Apply circuit breaker protection to a method
 *
 * @example
 * ```typescript
 * @CircuitBreaker({ failureThreshold: 5, timeout: 60000 })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 */
export const CircuitBreaker = (options?: CircuitBreakerOptions) => {
  return SetMetadata(CIRCUIT_BREAKER_METADATA, options || {});
};
