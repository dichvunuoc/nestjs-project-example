import { Global, Module } from '@nestjs/common';
import { RetryService } from './retry/retry.service';
import { CircuitBreakerService } from './circuit-breaker/circuit-breaker.service';

/**
 * Resilience Module
 * 
 * Provides retry và circuit breaker services
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [ResilienceModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [RetryService, CircuitBreakerService],
  exports: [RetryService, CircuitBreakerService],
})
export class ResilienceModule {}
