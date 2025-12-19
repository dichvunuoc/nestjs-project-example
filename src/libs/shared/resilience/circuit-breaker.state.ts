import { Logger } from '@nestjs/common';
import {
  CircuitState,
  CircuitBreakerOptions,
} from './circuit-breaker.decorator';

/**
 * Circuit Breaker State Management
 *
 * Tracks the state, metrics, and transitions for a single circuit breaker.
 * Implements the state machine for OPEN/CLOSED/HALF_OPEN states.
 */
export class CircuitBreakerState {
  private state: CircuitState = CircuitState.CLOSED;
  private stateChangedAt: number = Date.now();
  private requests: number = 0;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(
    private readonly options: CircuitBreakerOptions,
    private readonly logger: Logger,
  ) {
    this.stateChangedAt = Date.now();
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.requests++;
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // In HALF_OPEN, one success closes the circuit
      this.close();
      this.logger.debug('Circuit breaker closed after successful test call');
    }

    this.cleanupOldRequests();
  }

  /**
   * Record a failed operation
   */
  recordFailure(error: Error): void {
    // Check if this error should be counted
    if (this.options.errorFilter && !this.options.errorFilter(error)) {
      return; // Don't count this error
    }

    this.requests++;
    this.failures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // In HALF_OPEN, any failure opens the circuit again
      this.open();
      this.logger.debug('Circuit breaker opened again after test call failure');
    }

    this.cleanupOldRequests();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current options
   */
  getOptions(): CircuitBreakerOptions {
    return this.options;
  }

  /**
   * Check if circuit should open
   */
  shouldOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      return false;
    }

    // Check minimum requests threshold
    if (this.requests < (this.options.minRequests || 10)) {
      return false;
    }

    // Check error threshold
    const failureRate = this.getFailureRate();
    return failureRate >= (this.options.errorThreshold || 50);
  }

  /**
   * Open the circuit (start rejecting calls)
   */
  open(): void {
    this.state = CircuitState.OPEN;
    this.stateChangedAt = Date.now();
    this.logger.warn(
      `Circuit breaker opened. Failure rate: ${this.getFailureRate()}%`,
    );
  }

  /**
   * Close the circuit (allow calls)
   */
  close(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangedAt = Date.now();
    this.resetMetrics();
    this.logger.debug('Circuit breaker closed');
  }

  /**
   * Move to HALF_OPEN state (start testing)
   */
  halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.stateChangedAt = Date.now();
    this.resetMetrics();
    this.logger.debug('Circuit breaker moved to HALF_OPEN');
  }

  /**
   * Check if circuit should transition from OPEN to HALF_OPEN
   */
  shouldAttemptReset(): boolean {
    if (this.state !== CircuitState.OPEN) {
      return false;
    }

    const timeSinceOpen = Date.now() - this.stateChangedAt;
    return timeSinceOpen >= (this.options.resetTimeout || 30000);
  }

  /**
   * Get current metrics
   */
  getMetrics(): {
    requests: number;
    failures: number;
    successRate: number;
    failureRate: number;
  } {
    return {
      requests: this.requests,
      failures: this.failures,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
    };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.requests === 0) {
      return 100;
    }
    return ((this.requests - this.failures) / this.requests) * 100;
  }

  /**
   * Get failure rate percentage
   */
  getFailureRate(): number {
    if (this.requests === 0) {
      return 0;
    }
    return (this.failures / this.requests) * 100;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requests = 0;
    this.failures = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangedAt = Date.now();
    this.resetMetrics();
    this.logger.debug('Circuit breaker reset to initial state');
  }

  /**
   * Clean up old requests outside the time window
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const timeWindow = this.options.timeout || 60000;

    if (now - this.stateChangedAt > timeWindow) {
      // Reset metrics for new window
      this.requests = this.successCount;
      this.failures = this.failureCount;
      this.stateChangedAt = now;
    }
  }
}
