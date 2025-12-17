import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';

/**
 * Circuit Breaker Decorator
 *
 * Apply circuit breaker to method
 *
 * Usage:
 * ```typescript
 * @CircuitBreaker({ errorThresholdPercentage: 50 })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 */
export const CircuitBreaker = (options?: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, options || {});
