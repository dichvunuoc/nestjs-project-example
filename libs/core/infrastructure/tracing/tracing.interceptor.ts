import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { TracingService } from './tracing.service';
import { SpanKind, SpanStatusCode } from './tracing.interface';

/**
 * Tracing Interceptor
 * 
 * Automatically creates spans cho HTTP requests
 * 
 * Usage:
 * Add to main.ts: app.useGlobalInterceptors(new TracingInterceptor(tracingService))
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = request;

    // Extract trace context from headers (W3C Trace Context)
    const traceParent = request.headers['traceparent'] as string;
    const parentContext = traceParent ? this.parseTraceParent(traceParent) : undefined;

    // Start span
    const span = this.tracingService.startSpan(`HTTP ${method} ${url}`, {
      kind: SpanKind.SERVER,
      parent: parentContext,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.route': url.split('?')[0],
      },
    });

    // Set span attributes
    if (request.headers['user-agent']) {
      span.setAttribute('http.user_agent', request.headers['user-agent'] as string);
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 200;

          span.setAttribute('http.status_code', statusCode);
          span.setAttribute('http.duration_ms', duration);
          span.setStatus({
            code: statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
            message: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
          });
          span.end();
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || 500;

          span.setAttribute('http.status_code', statusCode);
          span.setAttribute('http.duration_ms', duration);
          span.setAttribute('error', true);
          span.setAttribute('error.message', error?.message || 'Unknown error');
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error?.message,
          });
          span.end();
        },
      }),
    );
  }

  /**
   * Parse W3C Trace Context header
   */
  private parseTraceParent(traceParent: string): any {
    // Format: 00-{traceId}-{spanId}-{traceFlags}
    const parts = traceParent.split('-');
    if (parts.length >= 4) {
      return {
        traceId: parts[1],
        spanId: parts[2],
        traceFlags: parseInt(parts[3], 16),
      };
    }
    return undefined;
  }
}
