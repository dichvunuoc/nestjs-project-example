import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMetricsService } from './metrics.interface';
import { Inject } from '@nestjs/common';

/**
 * Metrics Token
 */
export const METRICS_TOKEN = Symbol('IMetricsService');

/**
 * Metrics Interceptor
 * Automatically collects HTTP metrics
 * - Request duration
 * - Request count
 * - Request/Response size
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(METRICS_TOKEN) private readonly metricsService: IMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const { method, url } = request;

    // Extract route path (remove query params)
    const route = this.extractRoute(url);

    // Start timer
    const timer = this.metricsService.startTimer('http_request_duration_seconds', {
      method,
      route,
    });

    // Track request size
    const requestSize = this.getRequestSize(request);
    if (requestSize > 0) {
      this.metricsService.observeHistogram('http_request_size_bytes', requestSize, {
        method,
        route,
      });
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const statusCode = response.statusCode || 200;

          // Record duration
          timer();

          // Increment request counter
          this.metricsService.incrementCounter('http_requests_total', {
            method,
            route,
            status_code: statusCode.toString(),
          });

          // Track response size
          const responseSize = this.getResponseSize(data);
          this.metricsService.observeHistogram('http_response_size_bytes', responseSize, {
            method,
            route,
          });
        },
        error: (error) => {
          const statusCode = response.statusCode || 500;

          // Record duration
          timer();

          // Increment error counter
          this.metricsService.incrementCounter('http_requests_total', {
            method,
            route,
            status_code: statusCode.toString(),
          });
        },
      }),
    );
  }

  /**
   * Extract route from URL (remove query params and normalize)
   */
  private extractRoute(url: string): string {
    const path = url.split('?')[0];
    // Normalize paths with IDs (e.g., /users/123 -> /users/:id)
    return path.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/gi, '/:id');
  }

  /**
   * Get request size in bytes
   */
  private getRequestSize(request: FastifyRequest): number {
    const contentLength = request.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Get response size in bytes
   */
  private getResponseSize(data: any): number {
    if (!data) return 0;
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }
}
