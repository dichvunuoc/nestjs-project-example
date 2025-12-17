import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { StructuredLoggerService } from './logger.service';

/**
 * Logging Interceptor
 * 
 * Logs incoming requests và outgoing responses
 * Tracks request duration và status codes
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startTime = Date.now();

    const { method, url, headers, query, body } = request;
    const correlationId = (request as any).correlationId;
    const requestId = (request as any).requestId;

    // Log incoming request
    this.logger.info('Incoming request', {
      correlationId,
      requestId,
      method,
      url,
      userAgent: headers['user-agent'],
      ip: request.ip,
      query: Object.keys(query).length > 0 ? query : undefined,
      // Don't log body trong production để tránh log sensitive data
      ...(process.env.NODE_ENV !== 'production' && body ? { body } : {}),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 200;

          // Log successful response
          this.logger.info('Request completed', {
            correlationId,
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ...(duration > 1000 && { slow: true }), // Flag slow requests
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 500;

          // Log error response
          this.logger.error('Request failed', error, {
            correlationId,
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
          });
        },
      }),
    );
  }
}
