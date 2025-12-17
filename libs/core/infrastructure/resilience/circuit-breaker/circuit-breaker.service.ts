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
 * Implements Circuit Breaker pattern to prevent cascade failures
 * Protects against calling failing services repeatedly
 */
@Injectable()
export class CircuitBreakerService implements ICircuitBreaker {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private openedAt?: Date;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = {
      errorThresholdPercentage: options?.errorThresholdPercentage || 50,
      timeout: options?.timeout || 60000,
      resetTimeout: options?.resetTimeout || 30000,
      volumeThreshold: options?.volumeThreshold || 5,
      monitoringWindow: options?.monitoringWindow || 10000,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      if (
        this.openedAt &&
        Date.now() - this.openedAt.getTime() >= this.options.resetTimeout
      ) {
        this.logger.log('Circuit breaker transitioning to HALF_OPEN');
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successes = 0;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.logger.log('Circuit breaker transitioning to CLOSED');
      this.state = CircuitBreakerState.CLOSED;
      this.openedAt = undefined;
    }

    // Reset failure count after monitoring window
    const now = Date.now();
    if (
      this.lastFailureTime &&
      now - this.lastFailureTime.getTime() > this.options.monitoringWindow
    ) {
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    const errorRate =
      (this.failures / (this.failures + this.successes)) * 100;

    // Check if should open circuit
    if (
      this.state === CircuitBreakerState.CLOSED &&
      this.totalRequests >= this.options.volumeThreshold &&
      errorRate >= this.options.errorThresholdPercentage
    ) {
      this.logger.warn(
        `Circuit breaker opening: error rate ${errorRate.toFixed(2)}%`,
      );
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = new Date();
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If half-open and fails, go back to open
      this.logger.warn('Circuit breaker transitioning back to OPEN');
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = new Date();
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
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      openedAt: this.openedAt,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.logger.log('Circuit breaker reset');
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.openedAt = undefined;
  }
}
