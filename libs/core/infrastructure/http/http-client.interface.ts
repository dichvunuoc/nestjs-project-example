import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RetryOptions } from '../resilience/retry/retry.interface';
import { CircuitBreakerOptions } from '../resilience/circuit-breaker/circuit-breaker.interface';

/**
 * HTTP Request Options
 */
export interface HttpRequestOptions extends AxiosRequestConfig {
  /**
   * Retry options
   */
  retry?: RetryOptions;

  /**
   * Circuit breaker options
   */
  circuitBreaker?: CircuitBreakerOptions & { name?: string };

  /**
   * Timeout (ms)
   * @default 5000
   */
  timeout?: number;

  /**
   * Log request/response
   * @default true
   */
  logRequest?: boolean;
}

/**
 * HTTP Client Interface
 */
export interface IHttpClient {
  /**
   * GET request
   */
  get<T = any>(url: string, options?: HttpRequestOptions): Promise<T>;

  /**
   * POST request
   */
  post<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<T>;

  /**
   * PUT request
   */
  put<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<T>;

  /**
   * PATCH request
   */
  patch<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<T>;

  /**
   * DELETE request
   */
  delete<T = any>(url: string, options?: HttpRequestOptions): Promise<T>;

  /**
   * HEAD request
   */
  head<T = any>(url: string, options?: HttpRequestOptions): Promise<T>;

  /**
   * OPTIONS request
   */
  options<T = any>(url: string, options?: HttpRequestOptions): Promise<T>;

  /**
   * Raw request (for advanced use cases)
   */
  request<T = any>(config: HttpRequestOptions): Promise<AxiosResponse<T>>;
}
