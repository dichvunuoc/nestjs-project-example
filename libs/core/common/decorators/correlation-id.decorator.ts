import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

/**
 * Correlation ID Decorator
 * Extracts correlation ID from request
 *
 * @example
 * ```typescript
 * @Get()
 * async getData(@CorrelationId() correlationId: string) {
 *   // Use correlationId for logging, tracing, etc.
 * }
 * ```
 */
export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (
      (request as any).correlationId ||
      (request.headers[CORRELATION_ID_HEADER] as string) ||
      'unknown'
    );
  },
);
