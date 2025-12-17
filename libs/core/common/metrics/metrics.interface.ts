/**
 * Metrics Interface
 * Abstraction for metrics collection
 */
export interface IMetricsService {
  /**
   * Increment counter
   */
  incrementCounter(name: string, labels?: Record<string, string>): void;

  /**
   * Increment counter by value
   */
  incrementCounterBy(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Observe histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Start timer
   */
  startTimer(name: string, labels?: Record<string, string>): () => void;

  /**
   * Get metrics in Prometheus format
   */
  getMetrics(): Promise<string>;
}
