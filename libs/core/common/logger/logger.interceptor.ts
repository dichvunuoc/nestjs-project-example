import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LoggerService } from './logger.service';

/**
 * Logging Interceptor
 *
 * Logs all HTTP requests and responses with:
 * - Request method, path, query, body
 * - Response status code, duration
 * - Error details if any
 * - Correlation ID if available
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const { method, url, query, body, headers } = request;

    // Extract correlation ID from headers or generate one
    const correlationId =
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add correlation ID to response headers
    response.header('x-correlation-id', correlationId);

    const startTime = Date.now();
    const logger = this.logger.child({ correlationId });

    // Log request
    logger.info('Incoming request', {
      method,
      url,
      query,
      body: this.sanitizeBody(body),
      userAgent: headers['user-agent'],
      ip: request.ip,
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        logger.info('Request completed', {
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        logger.error('Request failed', error, {
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
        });

        throw error;
      }),
    );
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
