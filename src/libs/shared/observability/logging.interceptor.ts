import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs';
import { performance } from 'perf_hooks';
import { FastifyRequest, FastifyReply } from 'fastify';
import { StructuredLogger } from './structured-logger.service';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';

/**
 * Logging Interceptor
 *
 * Automatically logs all incoming requests and responses with structured format.
 * Captures request/response details, performance metrics, and errors.
 *
 * Features:
 * - Automatic request/response logging
 * - Performance timing for all operations
 * - Error logging with stack traces
 * - Request/response body logging (configurable)
 * - Correlation ID tracking
 * - Sanitization of sensitive data
 *
 * Usage:
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: LoggingInterceptor,
 *     },
 *   ],
 * })
 * export class CoreModule {}
 * ```
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: StructuredLogger,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = performance.now();

    // Log request
    this.logRequest(context);

    return next.handle().pipe(
      // Log success response
      tap((data) => {
        this.logResponse(context, data, startTime);
      }),
      // Log errors
      catchError((error) => {
        this.logError(context, error, startTime);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Log incoming request
   */
  private logRequest(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip;

    // Build log entry
    this.logger.info(`Incoming request: ${method} ${url}`, {
      operation: {
        name: `${method} ${url}`,
        type: 'http_request',
        phase: 'start',
      },
      data: {
        method,
        url,
        userAgent,
        ip,
        headers: this.sanitizeHeaders(
          request.headers as Record<string, string>,
        ),
        query: request.query,
        // Only log body for non-GET requests and if it's not too large
        body: this.shouldLogBody(request)
          ? this.sanitizeBody(request.body)
          : undefined,
      },
    });
  }

  /**
   * Log successful response
   */
  private logResponse(
    context: ExecutionContext,
    data: any,
    startTime: number,
  ): void {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const duration = Date.now() - startTime;

    this.logger.info(`Request completed: ${request.method} ${request.url}`, {
      operation: {
        name: `${request.method} ${request.url}`,
        type: 'http_request',
        phase: 'end',
        duration,
      },
      data: {
        statusCode: response.statusCode,
        responseSize: this.getResponseSize(response),
        // Only log response data for development
        responseData: this.shouldLogResponseData(response)
          ? this.sanitizeResponseData(data)
          : undefined,
      },
    });
  }

  /**
   * Log error response
   */
  private logError(
    context: ExecutionContext,
    error: Error,
    startTime: number,
  ): void {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const duration = Date.now() - startTime;

    this.logger.error(
      `Request failed: ${request.method} ${request.url} - ${error.message}`,
      error,
      {
        operation: {
          name: `${request.method} ${request.url}`,
          type: 'http_request',
          phase: 'error',
          duration,
        },
        data: {
          method: request.method,
          url: request.url,
          errorType: error.constructor.name,
          // Include stack trace in development only
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
    );
  }

  /**
   * Determine if request body should be logged
   */
  private shouldLogBody(request: FastifyRequest): boolean {
    // Don't log GET requests (no body)
    if (request.method === 'GET') return false;

    // Don't log if content-type suggests large data
    const contentType = request.headers['content-type'];
    if (contentType?.includes('multipart/form-data')) return false;
    if (contentType?.includes('application/octet-stream')) return false;

    // Don't log if body is too large (>1MB)
    if (
      request.headers['content-length'] &&
      parseInt(request.headers['content-length']) > 1024 * 1024
    ) {
      return false;
    }

    return true;
  }

  /**
   * Determine if response data should be logged
   */
  private shouldLogResponseData(response: FastifyReply): boolean {
    // Only in development
    if (process.env.NODE_ENV !== 'development') return false;

    // Don't log large responses
    if (
      response.getHeader('content-length') &&
      parseInt(response.getHeader('content-length') as string) > 1024 * 1024
    ) {
      return false;
    }

    // Don't log binary data
    const contentType = response.getHeader('content-type');
    if (typeof contentType === 'string') {
      if (contentType.includes('image/')) return false;
      if (contentType.includes('video/')) return false;
      if (contentType.includes('application/octet-stream')) return false;
    }

    return true;
  }

  /**
   * Get response size from headers
   */
  private getResponseSize(response: FastifyReply): number | undefined {
    const contentLength = response.getHeader('content-length');
    return contentLength ? parseInt(contentLength as string, 10) : undefined;
  }

  /**
   * Sanitize headers by removing sensitive information
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-session-token',
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body by removing sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];

    return this.redactFields(body, sensitiveFields);
  }

  /**
   * Sanitize response data
   */
  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    // For responses, we might want to redact different fields
    const sensitiveFields = [
      'token',
      'secret',
      'key',
      'accessToken',
      'refreshToken',
      'password',
    ];

    return this.redactFields(data, sensitiveFields);
  }

  /**
   * Recursively redact sensitive fields from object
   */
  private redactFields(obj: any, sensitiveFields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactFields(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.redactFields(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
