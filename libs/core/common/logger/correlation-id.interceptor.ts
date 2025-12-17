import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { StructuredLoggerService } from './logger.service';

/**
 * Correlation ID Interceptor
 * 
 * Injects correlation ID vào request và response headers
 * Correlation ID được sử dụng để trace requests qua multiple services
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly CORRELATION_ID_HEADER = 'x-correlation-id';
  private readonly REQUEST_ID_HEADER = 'x-request-id';

  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Get correlation ID từ header hoặc generate mới
    let correlationId = request.headers[this.CORRELATION_ID_HEADER] as string;
    if (!correlationId) {
      correlationId = randomUUID();
    }

    // Generate request ID (unique cho mỗi request)
    const requestId = randomUUID();

    // Set correlation ID trong logger
    this.logger.setCorrelationId(correlationId);

    // Add headers vào response
    response.header(this.CORRELATION_ID_HEADER, correlationId);
    response.header(this.REQUEST_ID_HEADER, requestId);

    // Add vào request object để có thể access trong handlers
    (request as any).correlationId = correlationId;
    (request as any).requestId = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful request
          this.logger.debug('Request completed', {
            correlationId,
            requestId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
          });
        },
        error: (error) => {
          // Log failed request
          this.logger.error('Request failed', error, {
            correlationId,
            requestId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode || 500,
          });
        },
      }),
    );
  }
}
