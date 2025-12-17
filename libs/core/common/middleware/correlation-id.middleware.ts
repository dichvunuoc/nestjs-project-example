import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Header Names
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID Middleware
 * Extracts or generates correlation ID for request tracking
 * Adds correlation ID to request object and response headers
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    // Extract correlation ID from headers or generate new one
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req.headers[REQUEST_ID_HEADER] as string) ||
      randomUUID();

    // Add to request object (for access in controllers/services)
    (req as any).correlationId = correlationId;

    // Add to response headers
    res.header(CORRELATION_ID_HEADER, correlationId);
    res.header(REQUEST_ID_HEADER, correlationId);

    next();
  }
}
