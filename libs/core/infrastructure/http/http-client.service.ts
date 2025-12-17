import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { IHttpClient, HttpRequestOptions } from './http-client.interface';
import { RetryService } from '../resilience/retry/retry.service';
import { CircuitBreakerService } from '../resilience/circuit-breaker/circuit-breaker.service';
import { LoggerService } from '../../common/logger/logger.service';
import { Optional } from '@nestjs/common';

/**
 * HTTP Client Service
 * 
 * Wraps @nestjs/axios với retry và circuit breaker
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly httpClient: HttpClientService) {}
 * 
 * const data = await this.httpClient.get('https://api.example.com/data', {
 *   retry: { maxAttempts: 3 },
 *   circuitBreaker: { name: 'external-api' },
 * });
 * ```
 */
@Injectable()
export class HttpClientService implements IHttpClient {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly retryService: RetryService,
    private readonly circuitBreakerService: CircuitBreakerService,
    @Optional() @Inject(LoggerService) private readonly loggerService?: LoggerService,
  ) {}

  async get<T = any>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'GET',
      url,
    });
  }

  async post<T = any>(
    url: string,
    data?: any,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'POST',
      url,
      data,
    });
  }

  async put<T = any>(
    url: string,
    data?: any,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'PUT',
      url,
      data,
    });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'PATCH',
      url,
      data,
    });
  }

  async delete<T = any>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'DELETE',
      url,
    });
  }

  async head<T = any>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'HEAD',
      url,
    });
  }

  async options<T = any>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: 'OPTIONS',
      url,
    });
  }

  async request<T = any>(
    config: HttpRequestOptions,
  ): Promise<AxiosResponse<T>> {
    const {
      retry,
      circuitBreaker,
      timeout = 5000,
      logRequest = true,
      ...axiosConfig
    } = config;

    // Set timeout
    axiosConfig.timeout = timeout;

    // Generate circuit breaker name
    const circuitBreakerName =
      circuitBreaker?.name || this.generateCircuitBreakerName(config);

    // Log request
    if (logRequest && this.loggerService) {
      this.loggerService.log(
        `HTTP ${config.method || 'GET'} ${config.url}`,
        'HttpClientService',
        {
          method: config.method,
          url: config.url,
          circuitBreaker: circuitBreakerName,
        },
      );
    }

    try {
      // Execute với circuit breaker và retry
      const response = await this.circuitBreakerService.execute(
        circuitBreakerName,
        () =>
          this.retryService.execute(
            async () => {
              const observable = this.httpService.request<T>(axiosConfig);
              const response = await firstValueFrom(observable);
              return response;
            },
            retry || {
              maxAttempts: 1, // Default: no retry unless specified
            },
          ),
        circuitBreaker || {
          timeout,
          errorThresholdPercentage: 50,
        },
      );

      // Log success
      if (logRequest && this.loggerService) {
        this.loggerService.log(
          `HTTP ${config.method || 'GET'} ${config.url} - ${response.status}`,
          'HttpClientService',
          {
            method: config.method,
            url: config.url,
            statusCode: response.status,
            duration: `${Date.now() - (config as any).startTime || 0}ms`,
          },
        );
      }

      return response;
    } catch (error) {
      // Log error
      if (this.loggerService) {
        const axiosError = error as AxiosError;
        this.loggerService.error(
          `HTTP ${config.method || 'GET'} ${config.url} failed`,
          axiosError.stack,
          'HttpClientService',
          {
            method: config.method,
            url: config.url,
            statusCode: axiosError.response?.status,
            error: axiosError.message,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Generate circuit breaker name from request config
   */
  private generateCircuitBreakerName(config: HttpRequestOptions): string {
    if (!config.url) return 'http-client';
    
    try {
      const url = new URL(config.url);
      return `http:${url.hostname}`;
    } catch {
      return `http:${config.url.split('/')[0]}`;
    }
  }
}
