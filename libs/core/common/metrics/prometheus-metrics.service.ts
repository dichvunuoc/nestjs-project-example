import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';
import { IMetricsService } from './metrics.interface';

// Fix for prom-client types
type Counter = promClient.Counter<string>;
type Gauge = promClient.Gauge<string>;
type Histogram = promClient.Histogram<string>;

/**
 * Prometheus Metrics Service
 * Collects and exposes metrics in Prometheus format
 */
@Injectable()
export class PrometheusMetricsService implements IMetricsService, OnModuleInit {
  private readonly counters: Map<string, Counter> = new Map();
  private readonly gauges: Map<string, Gauge> = new Map();
  private readonly histograms: Map<string, Histogram> = new Map();

  onModuleInit() {
    // Register default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      prefix: 'nestjs_',
    });

    // Initialize default HTTP metrics
    this.initializeHttpMetrics();
  }

  /**
   * Initialize default HTTP metrics
   */
  private initializeHttpMetrics() {
    // HTTP Request Duration Histogram
    this.getOrCreateHistogram('http_request_duration_seconds', {
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // HTTP Request Total Counter
    this.getOrCreateCounter('http_requests_total', {
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // HTTP Request Size Histogram
    this.getOrCreateHistogram('http_request_size_bytes', {
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // HTTP Response Size Histogram
    this.getOrCreateHistogram('http_response_size_bytes', {
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });
  }

  /**
   * Increment counter
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const counter = this.getOrCreateCounter(name, {
      help: `Counter: ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
    });
    counter.inc(labels || {});
  }

  /**
   * Increment counter by value
   */
  incrementCounterBy(name: string, value: number, labels?: Record<string, string>): void {
    const counter = this.getOrCreateCounter(name, {
      help: `Counter: ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
    });
    counter.inc(labels || {}, value);
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.getOrCreateGauge(name, {
      help: `Gauge: ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
    });
    gauge.set(labels || {}, value);
  }

  /**
   * Observe histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name, {
      help: `Histogram: ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
    });
    histogram.observe(labels || {}, value);
  }

  /**
   * Start timer
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const histogram = this.getOrCreateHistogram(name, {
      help: `Histogram: ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
    });
    const timer = histogram.startTimer(labels || {});
    return timer;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }

  /**
   * Get or create counter
   */
  private getOrCreateCounter(
    name: string,
    config: promClient.CounterConfiguration<string>,
  ): Counter {
    if (!this.counters.has(name)) {
      const counter = new promClient.Counter(config);
      this.counters.set(name, counter);
      promClient.register.registerMetric(counter);
    }
    return this.counters.get(name)!;
  }

  /**
   * Get or create gauge
   */
  private getOrCreateGauge(
    name: string,
    config: promClient.GaugeConfiguration<string>,
  ): Gauge {
    if (!this.gauges.has(name)) {
      const gauge = new promClient.Gauge(config);
      this.gauges.set(name, gauge);
      promClient.register.registerMetric(gauge);
    }
    return this.gauges.get(name)!;
  }

  /**
   * Get or create histogram
   */
  private getOrCreateHistogram(
    name: string,
    config: promClient.HistogramConfiguration<string>,
  ): Histogram {
    if (!this.histograms.has(name)) {
      const histogram = new promClient.Histogram(config);
      this.histograms.set(name, histogram);
      promClient.register.registerMetric(histogram);
    }
    return this.histograms.get(name)!;
  }
}
