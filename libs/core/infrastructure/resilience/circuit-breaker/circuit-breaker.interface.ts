/**
 * Circuit Breaker State
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject requests
  HALF_OPEN = 'half-open', // Testing if service recovered
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /**
   * Failure threshold - số lần fail trước khi open circuit
   */
  failureThreshold?: number;

  /**
   * Timeout - thời gian chờ trước khi coi là fail (ms)
   */
  timeout?: number;

  /**
   * Reset timeout - thời gian chờ trước khi thử lại (ms)
   */
  resetTimeout?: number;

  /**
   * Monitoring window - thời gian window để tính failure rate (ms)
   */
  monitoringWindow?: number;

  /**
   * Half-open attempts - số lần thử trong half-open state
   */
  halfOpenAttempts?: number;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openedAt?: Date;
}

/**
 * Circuit Breaker Interface
 */
export interface ICircuitBreaker {
  /**
   * Execute function với circuit breaker protection
   */
  execute<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Get current state
   */
  getState(): CircuitBreakerState;

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats;

  /**
   * Reset circuit breaker
   */
  reset(): void;
}
