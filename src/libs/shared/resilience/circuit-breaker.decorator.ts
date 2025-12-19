import {
  Injectable,
  SetMetadata,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CIRCUIT_BREAKER_CONFIG_TOKEN } from './constants';
import { CircuitBreakerState } from './circuit-breaker.state';

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerOptions {
  /**
   * Time window in milliseconds to monitor for failures
   */
  timeout?: number;

  /**
   * Error threshold percentage (0-100)
   */
  errorThreshold?: number;

  /**
   * Reset timeout in milliseconds (how long to stay open)
   */
  resetTimeout?: number;

  /**
   * Minimum number of calls before calculating error rate
   */
  minRequests?: number;

  /**
   * Volume threshold to start tripping
   */
  volumeThreshold?: number;

  /**
   * Fallback function to call when circuit is open
   */
  fallback?: (...args: any[]) => any;

  /**
   * Custom error filter function
   */
  errorFilter?: (error: Error) => boolean;

  /**
   * Whether to track metrics
   */
  trackMetrics?: boolean;

  /**
   * Circuit breaker identifier
   */
  name?: string;
}

/**
 * Circuit Breaker metadata key
 */
export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

/**
 * Circuit Breaker Decorator
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures.
 * Automatically opens when error rate exceeds threshold, closes after timeout.
 *
 * Usage:
 * ```typescript
 * @CircuitBreaker({
 *   timeout: 60000,        // 1 minute window
 *   errorThreshold: 50,    // Open if 50% errors
 *   resetTimeout: 30000,   // Stay open for 30 seconds
 *   fallback: () => ({ status: 'service_unavailable' })
 * })
 * @Injectable()
 * export class PaymentService {
 *   async processPayment(payment: PaymentDto): Promise<PaymentResult> {
 *     // This method will be protected by circuit breaker
 *   }
 * }
 *
 * @CircuitBreaker({
 *   name: 'ExternalAPI',
 *   timeout: 30000,
 *   errorThreshold: 60,
 *   errorFilter: (error) => {
 *     // Only treat network errors as failures
 *     return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
 *   }
 * })
 * async callExternalAPI(data: any): Promise<any> {
 *   // Only network errors will trip the circuit
 * }
 * ```
 */
export const CircuitBreaker = (options: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, options);

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject calls
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

/**
 * Circuit Breaker Service
 *
 * Manages circuit breaker instances across the application.
 * Tracks state, metrics, and handles transitions between states.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(CIRCUIT_BREAKER_CONFIG_TOKEN)
    private readonly globalConfig?: Partial<CircuitBreakerOptions>,
  ) {}

  /**
   * Execute a function through a circuit breaker
   */
  async execute<T>(
    target: any,
    propertyKey: string,
    args: any[],
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const key = this.getCircuitBreakerKey(target, propertyKey, options);
    const circuitBreaker = this.getCircuitBreaker(key, options);

    try {
      // Check if circuit is open
      if (circuitBreaker.getState() === CircuitState.OPEN) {
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      }

      // Execute the function
      const result = await target[propertyKey].apply(target, args);

      // Record success
      circuitBreaker.recordSuccess();

      return result;
    } catch (error) {
      // Record failure
      circuitBreaker.recordFailure(error);

      // Check if circuit should open
      if (circuitBreaker.shouldOpen()) {
        circuitBreaker.open();
        this.logger.warn(`Circuit breaker OPENED for ${key}`);
      }

      // Call fallback if available
      const fallback = circuitBreaker.getOptions().fallback;
      if (fallback) {
        try {
          return fallback(...args);
        } catch (fallbackError) {
          this.logger.error(`Fallback failed for ${key}`, fallbackError);
          throw error; // Throw original error if fallback fails
        }
      }

      throw error;
    }
  }

  /**
   * Get or create circuit breaker instance
   */
  private getCircuitBreaker(
    key: string,
    options?: CircuitBreakerOptions,
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(key)) {
      const mergedOptions = {
        timeout: 60000,
        errorThreshold: 50,
        resetTimeout: 30000,
        minRequests: 10,
        volumeThreshold: 5,
        trackMetrics: true,
        name: key,
        ...this.globalConfig,
        ...options,
      };

      const circuitBreaker = new CircuitBreakerState(
        mergedOptions,
        this.logger,
      );
      this.circuitBreakers.set(key, circuitBreaker);
    }

    return this.circuitBreakers.get(key)!;
  }

  /**
   * Generate circuit breaker key
   */
  private getCircuitBreakerKey(
    target: any,
    propertyKey: string,
    options?: CircuitBreakerOptions,
  ): string {
    if (options?.name) {
      return options.name;
    }

    const className = target.constructor?.name || 'Unknown';
    return `${className}.${propertyKey}`;
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getStatus(): Array<{
    name: string;
    state: CircuitState;
    metrics: {
      requests: number;
      failures: number;
      successRate: number;
      failureRate: number;
    };
  }> {
    return Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
      name,
      state: cb.getState(),
      metrics: cb.getMetrics(),
    }));
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  resetAll(): void {
    this.circuitBreakers.clear();
    this.logger.log('All circuit breakers have been reset');
  }

  /**
   * Reset specific circuit breaker
   */
  reset(key: string): boolean {
    if (this.circuitBreakers.has(key)) {
      this.circuitBreakers.get(key)!.reset();
      this.logger.log(`Circuit breaker ${key} has been reset`);
      return true;
    }
    return false;
  }
}

/**
 * Circuit Breaker Interceptor
 *
 * Automatically applies circuit breaker to decorated methods.
 * Works with the CircuitBreakerService to protect against failures.
 */
export class CircuitBreakerInterceptor {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: any, next: any): Promise<any> {
    // Get circuit breaker options from metadata
    const options =
      this.reflector.get<CircuitBreakerOptions>(
        CIRCUIT_BREAKER_KEY,
        context.getHandler(),
      ) ||
      this.reflector.get<CircuitBreakerOptions>(
        CIRCUIT_BREAKER_KEY,
        context.getClass(),
      );

    if (!options) {
      return next.handle(); // No circuit breaker configured
    }

    // Get target and method
    const target = context.getInstance();
    const propertyKey = context.getHandlerName();
    const args = context.getArgs();

    // Execute through circuit breaker
    return this.circuitBreakerService.execute(
      target,
      propertyKey,
      args,
      options,
    );
  }
}

/**
 * Circuit Breaker Health Indicator
 *
 * Provides health status of circuit breakers for monitoring.
 */
@Injectable()
export class CircuitBreakerHealthIndicator {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Check health of all circuit breakers
   */
  async checkHealth(): Promise<{
    status: 'UP' | 'DOWN';
    details: {
      total: number;
      healthy: number;
      unhealthy: number;
      circuits: Array<{
        name: string;
        state: CircuitState;
        health: 'healthy' | 'degraded' | 'unhealthy';
      }>;
    };
  }> {
    const status = this.circuitBreakerService.getStatus();
    const total = status.length;
    const healthy = status.filter(
      (cb) => cb.state === CircuitState.CLOSED,
    ).length;
    const unhealthy = status.filter(
      (cb) => cb.state === CircuitState.OPEN,
    ).length;

    const circuits = status.map((cb) => ({
      name: cb.name,
      state: cb.state,
      health: this.getHealthStatus(cb.state, cb.metrics.failureRate),
    }));

    return {
      status: unhealthy === 0 ? 'UP' : 'DOWN',
      details: {
        total,
        healthy,
        unhealthy,
        circuits,
      },
    };
  }

  /**
   * Determine health status based on circuit state and metrics
   */
  private getHealthStatus(
    state: CircuitState,
    failureRate: number,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (state === CircuitState.CLOSED && failureRate < 10) return 'healthy';
    if (state === CircuitState.HALF_OPEN || failureRate < 30) return 'degraded';
    return 'unhealthy';
  }
}

/**
 * Common Circuit Breaker Configurations
 */
export const CircuitBreakerConfigs = {
  /**
   * For external API calls with timeout considerations
   */
  ExternalAPI: {
    timeout: 60000,
    errorThreshold: 50,
    resetTimeout: 30000,
    minRequests: 5,
    fallback: () => ({ error: 'External service unavailable' }),
  },

  /**
   * For critical internal services with high reliability requirements
   */
  CriticalService: {
    timeout: 30000,
    errorThreshold: 20,
    resetTimeout: 60000,
    minRequests: 10,
    trackMetrics: true,
  },

  /**
   * For database connections with connection pooling
   */
  Database: {
    timeout: 10000,
    errorThreshold: 30,
    resetTimeout: 5000,
    errorFilter: (error: Error) => {
      // Only trip on connection errors, not query errors
      return (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      );
    },
  },

  /**
   * For cache services with fallback strategies
   */
  Cache: {
    timeout: 5000,
    errorThreshold: 70,
    resetTimeout: 10000,
    fallback: () => null, // Return null if cache fails
  },
} as const;
