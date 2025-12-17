import { Injectable, Inject, Optional } from '@nestjs/common';
import { IMetricsService } from './metrics.interface';
import { METRICS_TOKEN } from './metrics.interceptor';
import { PrometheusMetricsService } from './prometheus-metrics.service';

/**
 * Metrics Service Wrapper
 * Provides convenient access to metrics functionality
 */
@Injectable()
export class MetricsService {
  constructor(
    @Inject(METRICS_TOKEN) @Optional() private readonly metrics?: IMetricsService,
  ) {
    // Fallback to PrometheusMetricsService if no metrics provided
    if (!this.metrics) {
      this.metrics = new PrometheusMetricsService();
    }
  }

  /**
   * Get metrics instance
   */
  getMetrics(): IMetricsService {
    return this.metrics!;
  }

  /**
   * Increment counter
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.metrics!.incrementCounter(name, labels);
  }

  /**
   * Increment counter by value
   */
  incrementCounterBy(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics!.incrementCounterBy(name, value, labels);
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics!.setGauge(name, value, labels);
  }

  /**
   * Observe histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics!.observeHistogram(name, value, labels);
  }

  /**
   * Start timer
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    return this.metrics!.startTimer(name, labels);
  }
}
