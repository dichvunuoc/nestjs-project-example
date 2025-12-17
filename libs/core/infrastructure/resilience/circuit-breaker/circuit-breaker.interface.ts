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
   * Timeout for operation (ms)
   * @default 3000
   */
  timeout?: number;

  /**
   * Error threshold percentage to open circuit
   * @default 50
   */
  errorThresholdPercentage?: number;

  /**
   * Reset timeout before attempting to close circuit (ms)
   * @default 30000
   */
  resetTimeout?: number;

  /**
   * Minimum number of requests before circuit can open
   * @default 5
   */
  minimumRequests?: number;

  /**
   * Rolling window size for statistics (ms)
   * @default 60000
   */
  rollingWindow?: number;

  /**
   * Function called when circuit opens
   */
  onOpen?: () => void;

  /**
   * Function called when circuit closes
   */
  onClose?: () => void;

  /**
   * Function called when circuit half-opens
   */
  onHalfOpen?: () => void;
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
  lastSuccessTime?: Date;
  openedAt?: Date;
}

/**
 * Circuit Breaker Service Interface
 */
export interface ICircuitBreakerService {
  /**
   * Execute function with circuit breaker
   */
  execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T>;

  /**
   * Get circuit breaker statistics
   */
  getStats(name: string): CircuitBreakerStats | undefined;

  /**
   * Reset circuit breaker
   */
  reset(name: string): void;
}
