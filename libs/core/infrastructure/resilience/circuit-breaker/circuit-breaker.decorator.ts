import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

/**
 * Circuit Breaker Decorator
 * 
 * Apply circuit breaker protection to a method
 * 
 * @example
 * ```typescript
 * @CircuitBreaker({ failureThreshold: 5, timeout: 5000 })
 * async callExternalApi() {
 *   return this.httpClient.get('/api/data');
 * }
 * ```
 */
export const CircuitBreaker = (options?: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, options || {});
