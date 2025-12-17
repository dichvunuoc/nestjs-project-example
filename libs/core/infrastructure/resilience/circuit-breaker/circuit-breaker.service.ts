import { Injectable, Logger } from '@nestjs/common';
import {
  ICircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerOptions,
  CircuitBreakerStats,
} from './circuit-breaker.interface';

/**
 * Circuit Breaker Service Implementation
 * Protects against cascade failures by opening circuit when failures exceed threshold
 */
@Injectable()
export class CircuitBreakerService implements ICircuitBreaker {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;

  constructor(
    private readonly options: CircuitBreakerOptions = {},
    private readonly name: string = 'default',
  ) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      timeout: options.timeout || 60000, // 60 seconds
      resetTimeout: options.resetTimeout || 30000, // 30 seconds
      monitoringWindow: options.monitoringWindow || 60000, // 60 seconds
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime.getTime()) {
        this.logger.debug(`Circuit breaker ${this.name}: Moving to HALF_OPEN state`);
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
        );
      }
    }

    try {
      // Execute function with timeout
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise<T>(),
      ]);

      // Success - reset failures if in HALF_OPEN
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.logger.debug(`Circuit breaker ${this.name}: Moving to CLOSED state`);
        this.state = CircuitBreakerState.CLOSED;
        this.failures = 0;
      }

      this.successes++;
      this.lastSuccessTime = new Date();

      return result;
    } catch (error) {
      // Failure - increment failure count
      this.failures++;
      this.lastFailureTime = new Date();

      this.logger.warn(
        `Circuit breaker ${this.name}: Failure ${this.failures}/${this.options.failureThreshold}`,
      );

      // Check if threshold exceeded
      if (this.failures >= this.options.failureThreshold!) {
        this.logger.error(
          `Circuit breaker ${this.name}: Opening circuit (failures: ${this.failures})`,
        );
        this.state = CircuitBreakerState.OPEN;
        this.nextAttemptTime = new Date(
          Date.now() + this.options.resetTimeout!,
        );
      }

      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset(): void {
    this.logger.debug(`Circuit breaker ${this.name}: Manual reset`);
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker ${this.name}: Operation timeout`));
      }, this.options.timeout);
    });
  }
}
