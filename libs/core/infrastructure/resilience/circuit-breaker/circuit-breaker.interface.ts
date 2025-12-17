/**
 * Circuit Breaker State
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /**
   * Failure threshold - number of failures before opening circuit
   */
  failureThreshold?: number;

  /**
   * Timeout in milliseconds - how long to wait before considering request failed
   */
  timeout?: number;

  /**
   * Reset timeout in milliseconds - how long to wait before trying again
   */
  resetTimeout?: number;

  /**
   * Monitoring window in milliseconds - time window for failure counting
   */
  monitoringWindow?: number;
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
  nextAttemptTime?: Date;
}

/**
 * Circuit Breaker Interface
 */
export interface ICircuitBreaker {
  /**
   * Execute function with circuit breaker protection
   */
  execute<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats;

  /**
   * Reset circuit breaker manually
   */
  reset(): void;
}
