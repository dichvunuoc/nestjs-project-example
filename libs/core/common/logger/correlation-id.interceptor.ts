import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';
// Simple UUID v4 generator (no external dependency)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import { LoggerService } from './logger.service';

/**
 * Correlation ID Interceptor
 * 
 * Injects correlation ID vào request context để track requests qua services
 * - Reads X-Correlation-ID từ header hoặc generates new one
 * - Adds correlation ID vào logger context
 * - Adds correlation ID vào response header
 * 
 * Usage:
 * - Add to main.ts: app.useGlobalInterceptors(new CorrelationIdInterceptor(logger))
 * - Or use @CorrelationId() decorator trong controller để get correlation ID
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly CORRELATION_ID_HEADER = 'x-correlation-id';

  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Get correlation ID from header or generate new one
    const correlationId =
      (request.headers[this.CORRELATION_ID_HEADER] as string) ||
      (request.headers['x-request-id'] as string) ||
      generateUUID();

    // Set correlation ID in logger context
    this.logger.setContext({ correlationId });

    // Add correlation ID to request object for easy access
    (request as any).correlationId = correlationId;

    // Add correlation ID to response header
    response.header(this.CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
