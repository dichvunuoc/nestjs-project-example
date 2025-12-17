import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

/**
 * Circuit Breaker Factory
 * Creates and manages circuit breaker instances
 */
@Injectable()
export class CircuitBreakerFactory {
  private readonly breakers: Map<string, CircuitBreakerService> = new Map();

  /**
   * Get or create circuit breaker
   */
  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreakerService {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreakerService(options, name));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get circuit breaker by name
   */
  get(name: string): CircuitBreakerService | undefined {
    return this.breakers.get(name);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }
}
