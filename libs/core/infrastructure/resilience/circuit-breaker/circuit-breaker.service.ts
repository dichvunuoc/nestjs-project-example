import { Injectable, Logger } from '@nestjs/common';
import {
  ICircuitBreakerService,
  CircuitBreakerOptions,
  CircuitBreakerState,
  CircuitBreakerStats,
} from './circuit-breaker.interface';

/**
 * Circuit Breaker Implementation
 * 
 * Simple in-memory circuit breaker implementation
 * For production, consider using libraries like opossum or @nestjs/terminus
 */
interface CircuitBreakerInstance {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openedAt?: Date;
  options: Required<CircuitBreakerOptions>;
  requestHistory: Array<{ time: Date; success: boolean }>;
}

@Injectable()
export class CircuitBreakerService implements ICircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers: Map<string, CircuitBreakerInstance> = new Map();

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options: CircuitBreakerOptions = {},
  ): Promise<T> {
    const breaker = this.getOrCreateBreaker(name, options);

    // Check circuit state
    if (breaker.state === CircuitBreakerState.OPEN) {
      const timeSinceOpen = Date.now() - (breaker.openedAt?.getTime() || 0);
      if (timeSinceOpen < breaker.options.resetTimeout) {
        this.logger.warn(
          `Circuit breaker '${name}' is OPEN. Rejecting request.`,
        );
        throw new Error(`Circuit breaker '${name}' is OPEN`);
      } else {
        // Try to half-open
        breaker.state = CircuitBreakerState.HALF_OPEN;
        breaker.options.onHalfOpen?.();
        this.logger.log(`Circuit breaker '${name}' moved to HALF_OPEN`);
      }
    }

    // Execute function with timeout
    try {
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise(breaker.options.timeout),
      ]);

      // Success
      this.recordSuccess(breaker);
      return result as T;
    } catch (error) {
      // Failure
      this.recordFailure(breaker, error);
      throw error;
    }
  }

  getStats(name: string): CircuitBreakerStats | undefined {
    const breaker = this.breakers.get(name);
    if (!breaker) return undefined;

    return {
      state: breaker.state,
      failures: breaker.failures,
      successes: breaker.successes,
      totalRequests: breaker.totalRequests,
      lastFailureTime: breaker.lastFailureTime,
      lastSuccessTime: breaker.lastSuccessTime,
      openedAt: breaker.openedAt,
    };
  }

  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failures = 0;
      breaker.successes = 0;
      breaker.totalRequests = 0;
      breaker.requestHistory = [];
      breaker.openedAt = undefined;
      this.logger.log(`Circuit breaker '${name}' reset`);
    }
  }

  private getOrCreateBreaker(
    name: string,
    options: CircuitBreakerOptions,
  ): CircuitBreakerInstance {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successes: 0,
        totalRequests: 0,
        requestHistory: [],
        options: {
          timeout: options.timeout || 3000,
          errorThresholdPercentage: options.errorThresholdPercentage || 50,
          resetTimeout: options.resetTimeout || 30000,
          minimumRequests: options.minimumRequests || 5,
          rollingWindow: options.rollingWindow || 60000,
          onOpen: options.onOpen,
          onClose: options.onClose,
          onHalfOpen: options.onHalfOpen,
        },
      };
      this.breakers.set(name, breaker);
    }

    return breaker;
  }

  private recordSuccess(breaker: CircuitBreakerInstance): void {
    breaker.successes++;
    breaker.totalRequests++;
    breaker.lastSuccessTime = new Date();
    breaker.requestHistory.push({ time: new Date(), success: true });

    // Clean old history
    this.cleanHistory(breaker);

    // If half-open and success, close circuit
    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failures = 0;
      breaker.options.onClose?.();
      this.logger.log('Circuit breaker closed after successful request');
    }
  }

  private recordFailure(breaker: CircuitBreakerInstance, error: any): void {
    breaker.failures++;
    breaker.totalRequests++;
    breaker.lastFailureTime = new Date();
    breaker.requestHistory.push({ time: new Date(), success: false });

    // Clean old history
    this.cleanHistory(breaker);

    // Check if should open circuit
    if (
      breaker.state === CircuitBreakerState.CLOSED ||
      breaker.state === CircuitBreakerState.HALF_OPEN
    ) {
      const errorRate = this.calculateErrorRate(breaker);
      if (
        breaker.totalRequests >= breaker.options.minimumRequests &&
        errorRate >= breaker.options.errorThresholdPercentage
      ) {
        breaker.state = CircuitBreakerState.OPEN;
        breaker.openedAt = new Date();
        breaker.options.onOpen?.();
        this.logger.warn(
          `Circuit breaker opened. Error rate: ${errorRate.toFixed(2)}%`,
        );
      }
    }
  }

  private calculateErrorRate(breaker: CircuitBreakerInstance): number {
    if (breaker.totalRequests === 0) return 0;

    const recentRequests = breaker.requestHistory.filter(
      (req) =>
        Date.now() - req.time.getTime() < breaker.options.rollingWindow,
    );

    if (recentRequests.length === 0) return 0;

    const failures = recentRequests.filter((req) => !req.success).length;
    return (failures / recentRequests.length) * 100;
  }

  private cleanHistory(breaker: CircuitBreakerInstance): void {
    const cutoff = Date.now() - breaker.options.rollingWindow;
    breaker.requestHistory = breaker.requestHistory.filter(
      (req) => req.time.getTime() > cutoff,
    );
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });
  }
}
