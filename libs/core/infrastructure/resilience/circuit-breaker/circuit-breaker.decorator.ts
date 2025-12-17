import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

/**
 * Circuit Breaker Decorator Metadata Key
 */
export const CIRCUIT_BREAKER_OPTIONS_KEY = 'circuit-breaker:options';

/**
 * Circuit Breaker Decorator
 * 
 * Apply circuit breaker to method
 * 
 * Usage:
 * ```typescript
 * @CircuitBreaker({ timeout: 3000, errorThresholdPercentage: 50 })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 * 
 * Note: Requires CircuitBreakerInterceptor to be applied
 */
export const CircuitBreaker = (name: string, options?: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_OPTIONS_KEY, { name, ...options });
