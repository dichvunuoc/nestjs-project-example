import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Correlation ID Interceptor
 *
 * Generates or extracts correlation ID from request headers
 * and adds it to response headers and request context
 *
 * Correlation ID format: UUID v4
 * Header name: X-Correlation-ID
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Extract or generate correlation ID
    const correlationId =
      this.extractCorrelationId(request) || this.generateCorrelationId();

    // Add to request headers (for downstream services)
    request.headers['x-correlation-id'] = correlationId;

    // Add to response headers
    response.header('x-correlation-id', correlationId);

    // Store in request context for use in services
    (request as any).correlationId = correlationId;

    return next.handle();
  }

  /**
   * Extract correlation ID from request headers
   */
  private extractCorrelationId(request: FastifyRequest): string | undefined {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string)
    );
  }

  /**
   * Generate new correlation ID
   * Format: timestamp-randomstring
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }
}
