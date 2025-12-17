import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IMetricsService,
  ICounter,
  IGauge,
  IHistogram,
  ISummary,
  CounterOptions,
  GaugeOptions,
  HistogramOptions,
  SummaryOptions,
} from './metrics.interface';

/**
 * Metrics Service
 * 
 * Prometheus metrics collection service
 * 
 * Dependencies required:
 * - prom-client: npm install prom-client
 * 
 * Environment variables:
 * - METRICS_ENABLED: true (default: true)
 * - METRICS_PREFIX: nestjs_ (default: nestjs_)
 */
@Injectable()
export class MetricsService implements IMetricsService, OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private registry: any = null;
  private initialized = false;
  private readonly enabled = process.env.METRICS_ENABLED !== 'false';
  private readonly prefix = process.env.METRICS_PREFIX || 'nestjs_';

  async onModuleInit() {
    if (this.enabled) {
      await this.initialize();
    } else {
      this.logger.log('Metrics collection is disabled');
    }
  }

  /**
   * Initialize Prometheus registry
   */
  private async initialize(): Promise<void> {
    try {
      // Dynamic import để tránh lỗi nếu prom-client chưa được cài
      const { Registry, Counter, Gauge, Histogram, Summary } = await import('prom-client');
      
      this.registry = new Registry();
      this.initialized = true;
      
      this.logger.log('Prometheus metrics initialized');
    } catch (error) {
      this.logger.warn(
        'Prometheus client not available. Metrics will be disabled.',
        error instanceof Error ? error.message : String(error),
      );
      // Create no-op implementation
      this.registry = this.createNoOpRegistry();
    }
  }

  /**
   * Create no-op registry
   */
  private createNoOpRegistry(): any {
    return {
      registerMetric: () => {},
      metrics: async () => '',
    };
  }

  createCounter(options: CounterOptions): ICounter {
    if (!this.enabled || !this.initialized) {
      return this.createNoOpCounter();
    }

    try {
      const { Counter } = require('prom-client');
      const counter = new Counter({
        name: `${this.prefix}${options.name}`,
        help: options.help,
        labelNames: options.labelNames || [],
        registers: [this.registry],
      });

      return {
        inc: (value = 1, labels = {}) => {
          counter.inc(labels, value);
        },
      };
    } catch (error) {
      this.logger.error('Error creating counter:', error);
      return this.createNoOpCounter();
    }
  }

  createGauge(options: GaugeOptions): IGauge {
    if (!this.enabled || !this.initialized) {
      return this.createNoOpGauge();
    }

    try {
      const { Gauge } = require('prom-client');
      const gauge = new Gauge({
        name: `${this.prefix}${options.name}`,
        help: options.help,
        labelNames: options.labelNames || [],
        registers: [this.registry],
      });

      return {
        set: (value: number, labels = {}) => {
          gauge.set(labels, value);
        },
        inc: (value = 1, labels = {}) => {
          gauge.inc(labels, value);
        },
        dec: (value = 1, labels = {}) => {
          gauge.dec(labels, value);
        },
      };
    } catch (error) {
      this.logger.error('Error creating gauge:', error);
      return this.createNoOpGauge();
    }
  }

  createHistogram(options: HistogramOptions): IHistogram {
    if (!this.enabled || !this.initialized) {
      return this.createNoOpHistogram();
    }

    try {
      const { Histogram } = require('prom-client');
      const histogram = new Histogram({
        name: `${this.prefix}${options.name}`,
        help: options.help,
        buckets: options.buckets || [0.1, 0.5, 1, 2, 5, 10, 30, 60],
        labelNames: options.labelNames || [],
        registers: [this.registry],
      });

      return {
        observe: (value: number, labels = {}) => {
          histogram.observe(labels, value);
        },
      };
    } catch (error) {
      this.logger.error('Error creating histogram:', error);
      return this.createNoOpHistogram();
    }
  }

  createSummary(options: SummaryOptions): ISummary {
    if (!this.enabled || !this.initialized) {
      return this.createNoOpSummary();
    }

    try {
      const { Summary } = require('prom-client');
      const summary = new Summary({
        name: `${this.prefix}${options.name}`,
        help: options.help,
        percentiles: options.percentiles || [0.5, 0.9, 0.95, 0.99],
        maxAgeSeconds: options.maxAgeSeconds || 600,
        labelNames: options.labelNames || [],
        registers: [this.registry],
      });

      return {
        observe: (value: number, labels = {}) => {
          summary.observe(labels, value);
        },
      };
    } catch (error) {
      this.logger.error('Error creating summary:', error);
      return this.createNoOpSummary();
    }
  }

  async getMetrics(): Promise<string> {
    if (!this.enabled || !this.initialized || !this.registry) {
      return '';
    }

    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error('Error getting metrics:', error);
      return '';
    }
  }

  reset(): void {
    if (this.registry && this.registry.clear) {
      this.registry.clear();
      this.logger.log('Metrics reset');
    }
  }

  // No-op implementations
  private createNoOpCounter(): ICounter {
    return { inc: () => {} };
  }

  private createNoOpGauge(): IGauge {
    return { set: () => {}, inc: () => {}, dec: () => {} };
  }

  private createNoOpHistogram(): IHistogram {
    return { observe: () => {} };
  }

  private createNoOpSummary(): ISummary {
    return { observe: () => {} };
  }
}
