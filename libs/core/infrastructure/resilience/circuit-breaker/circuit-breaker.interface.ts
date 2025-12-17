/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /**
   * Error threshold percentage (0-100)
   * @default 50
   */
  errorThresholdPercentage?: number;

  /**
   * Timeout in milliseconds before attempting to close circuit
   * @default 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Reset timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  resetTimeout?: number;

  /**
   * Minimum number of requests before circuit can open
   * @default 5
   */
  volumeThreshold?: number;

  /**
   * Monitoring window in milliseconds
   * @default 10000 (10 seconds)
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
  totalRequests: number;
  lastFailureTime?: Date;
  openedAt?: Date;
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
   * Reset circuit breaker
   */
  reset(): void;
}
