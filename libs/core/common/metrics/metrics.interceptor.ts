import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { MetricsService } from './metrics.service';

/**
 * Metrics Interceptor
 * 
 * Automatically collects metrics cho HTTP requests:
 * - Request count (counter)
 * - Request duration (histogram)
 * - Active requests (gauge)
 * 
 * Usage:
 * Add to main.ts: app.useGlobalInterceptors(new MetricsInterceptor(metricsService))
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private requestCounter: any;
  private requestDuration: any;
  private activeRequests: any;

  constructor(private readonly metricsService: MetricsService) {
    // Initialize metrics
    this.requestCounter = metricsService.createCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.requestDuration = metricsService.createHistogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.activeRequests = metricsService.createGauge({
      name: 'http_active_requests',
      help: 'Number of active HTTP requests',
      labelNames: ['method', 'route'],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = request;
    const route = url.split('?')[0]; // Remove query params
    const startTime = Date.now();

    // Increment active requests
    this.activeRequests.inc({ method, route });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 200;

          // Record metrics
          this.requestCounter.inc({
            method,
            route,
            status_code: statusCode.toString(),
          });

          this.requestDuration.observe(
            {
              method,
              route,
              status_code: statusCode.toString(),
            },
            duration,
          );

          // Decrement active requests
          this.activeRequests.dec({ method, route });
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = error?.status || 500;

          // Record metrics
          this.requestCounter.inc({
            method,
            route,
            status_code: statusCode.toString(),
          });

          this.requestDuration.observe(
            {
              method,
              route,
              status_code: statusCode.toString(),
            },
            duration,
          );

          // Decrement active requests
          this.activeRequests.dec({ method, route });
        },
      }),
    );
  }
}
