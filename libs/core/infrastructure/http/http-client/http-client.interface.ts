/**
 * HTTP Method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP Request Options
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreaker?: boolean;
  query?: Record<string, any>;
  body?: any;
}

/**
 * HTTP Response
 */
export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

/**
 * HTTP Client Interface
 * 
 * Abstraction cho HTTP client với built-in resilience features
 */
export interface IHttpClient {
  /**
   * GET request
   */
  get<T = any>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * POST request
   */
  post<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * PUT request
   */
  put<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * PATCH request
   */
  patch<T = any>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * DELETE request
   */
  delete<T = any>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Generic request
   */
  request<T = any>(
    method: HttpMethod,
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
}
