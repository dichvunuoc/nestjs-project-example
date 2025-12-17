import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { LoggerService } from './logger.service';

/**
 * Logging Interceptor
 * 
 * Logs all HTTP requests và responses với:
 * - Request method, URL, headers
 * - Response status code, timing
 * - Error logging
 * - Correlation ID từ context
 * 
 * Usage:
 * Add to main.ts: app.useGlobalInterceptors(new LoggingInterceptor(logger))
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, headers, body, query, params } = request;
    const startTime = Date.now();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    // Log request
    this.logger.log('Incoming request', `${controller}.${handler}`, {
      method,
      url,
      controller,
      handler,
      query: Object.keys(query || {}).length > 0 ? query : undefined,
      params: Object.keys(params || {}).length > 0 ? params : undefined,
      // Don't log body in production for security
      ...(process.env.NODE_ENV !== 'production' && body && { body }),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 200;

          this.logger.log('Request completed', `${controller}.${handler}`, {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || 500;

          this.logger.error('Request failed', error.stack, `${controller}.${handler}`, {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            error: {
              name: error?.name,
              message: error?.message,
              code: (error as any)?.code,
            },
          });
        },
      }),
    );
  }
}
