import { Global, Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker/circuit-breaker.service';
import { RetryService } from './retry/retry.service';

/**
 * Resilience Module
 * 
 * Provides circuit breaker và retry mechanisms
 */
@Global()
@Module({
  providers: [
    CircuitBreakerService,
    RetryService,
  ],
  exports: [
    CircuitBreakerService,
    RetryService,
  ],
})
export class ResilienceModule {}
