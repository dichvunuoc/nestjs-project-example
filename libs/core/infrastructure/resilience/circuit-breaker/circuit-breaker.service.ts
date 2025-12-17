import { Injectable, Logger } from '@nestjs/common';
import {
  ICircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerOptions,
  CircuitBreakerStats,
} from './circuit-breaker.interface';

/**
 * Circuit Breaker Service
 * 
 * Implements circuit breaker pattern để protect against cascading failures
 */
@Injectable()
export class CircuitBreakerService implements ICircuitBreaker {
  private readonly logger = new Logger(CircuitBreakerService.name);

  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private openedAt?: Date;
  private halfOpenAttempts: number = 0;

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      timeout: options.timeout ?? 5000,
      resetTimeout: options.resetTimeout ?? 60000,
      monitoringWindow: options.monitoringWindow ?? 60000,
      halfOpenAttempts: options.halfOpenAttempts ?? 3,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      if (this.openedAt && Date.now() - this.openedAt.getTime() >= this.options.resetTimeout) {
        this.transitionToHalfOpen();
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      // Execute function với timeout
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise<T>(),
      ]);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure();
      throw error;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  /**
   * Handle success
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenAttempts) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitBreakerState.OPEN) {
      // Should not happen, but handle it
      this.transitionToHalfOpen();
    }

    // Reset failures trong monitoring window
    this.resetFailuresIfNeeded();
  }

  /**
   * Handle failure
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed trong half-open, open lại
      this.transitionToOpen();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if threshold reached
      if (this.failures >= this.options.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.openedAt = new Date();
    this.halfOpenAttempts = 0;
    this.logger.warn('Circuit breaker opened', {
      failures: this.failures,
      threshold: this.options.failureThreshold,
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenAttempts = 0;
    this.logger.log('Circuit breaker half-open - testing recovery');
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = undefined;
    this.logger.log('Circuit breaker closed - service recovered');
  }

  /**
   * Reset failures nếu đã qua monitoring window
   */
  private resetFailuresIfNeeded(): void {
    if (this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceLastFailure >= this.options.monitoringWindow) {
        this.failures = 0;
      }
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.openedAt = undefined;
    this.logger.log('Circuit breaker reset');
  }
}
