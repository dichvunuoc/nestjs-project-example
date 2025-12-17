/**
 * Metric Type
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Counter Options
 */
export interface CounterOptions {
  /**
   * Counter name
   */
  name: string;

  /**
   * Counter help/description
   */
  help: string;

  /**
   * Label names
   */
  labelNames?: string[];
}

/**
 * Gauge Options
 */
export interface GaugeOptions {
  /**
   * Gauge name
   */
  name: string;

  /**
   * Gauge help/description
   */
  help: string;

  /**
   * Label names
   */
  labelNames?: string[];
}

/**
 * Histogram Options
 */
export interface HistogramOptions {
  /**
   * Histogram name
   */
  name: string;

  /**
   * Histogram help/description
   */
  help: string;

  /**
   * Buckets for histogram
   */
  buckets?: number[];

  /**
   * Label names
   */
  labelNames?: string[];
}

/**
 * Summary Options
 */
export interface SummaryOptions {
  /**
   * Summary name
   */
  name: string;

  /**
   * Summary help/description
   */
  help: string;

  /**
   * Percentiles
   */
  percentiles?: number[];

  /**
   * Max age (ms)
   */
  maxAgeSeconds?: number;

  /**
   * Label names
   */
  labelNames?: string[];
}

/**
 * Metrics Service Interface
 */
export interface IMetricsService {
  /**
   * Create counter
   */
  createCounter(options: CounterOptions): ICounter;

  /**
   * Create gauge
   */
  createGauge(options: GaugeOptions): IGauge;

  /**
   * Create histogram
   */
  createHistogram(options: HistogramOptions): IHistogram;

  /**
   * Create summary
   */
  createSummary(options: SummaryOptions): ISummary;

  /**
   * Get metrics in Prometheus format
   */
  getMetrics(): Promise<string>;

  /**
   * Reset all metrics
   */
  reset(): void;
}

/**
 * Counter Interface
 */
export interface ICounter {
  /**
   * Increment counter
   */
  inc(value?: number, labels?: Record<string, string>): void;
}

/**
 * Gauge Interface
 */
export interface IGauge {
  /**
   * Set gauge value
   */
  set(value: number, labels?: Record<string, string>): void;

  /**
   * Increment gauge
   */
  inc(value?: number, labels?: Record<string, string>): void;

  /**
   * Decrement gauge
   */
  dec(value?: number, labels?: Record<string, string>): void;
}

/**
 * Histogram Interface
 */
export interface IHistogram {
  /**
   * Observe value
   */
  observe(value: number, labels?: Record<string, string>): void;
}

/**
 * Summary Interface
 */
export interface ISummary {
  /**
   * Observe value
   */
  observe(value: number, labels?: Record<string, string>): void;
}
