import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ILogger } from './logger.interface';
import { LOGGER_TOKEN } from './logger.service';
import { Inject } from '@nestjs/common';

/**
 * Logging Interceptor
 * Logs all HTTP requests and responses
 * Includes request ID, method, URL, status code, duration
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const { method, url, headers, ip } = request;

    // Extract correlation ID from headers or generate one
    const correlationId =
      (headers['x-correlation-id'] as string) ||
      (headers['x-request-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create child logger with context
    const requestLogger = this.logger.child({
      correlationId,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
    });

    const startTime = Date.now();

    // Log request
    requestLogger.info('Incoming request', {
      method,
      url,
      headers: this.sanitizeHeaders(headers),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 200;

          requestLogger.info('Request completed', {
            statusCode,
            duration: `${duration}ms`,
            responseSize: JSON.stringify(data).length,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;

          requestLogger.error(error, 'Request failed', {
            statusCode,
            duration: `${duration}ms`,
            errorName: error?.name,
            errorMessage: error?.message,
          });
        },
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        requestLogger.error(error, 'Request error', {
          statusCode,
          duration: `${duration}ms`,
        });

        throw error;
      }),
    );
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
