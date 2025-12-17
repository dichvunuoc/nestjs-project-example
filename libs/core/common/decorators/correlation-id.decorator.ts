import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * Correlation ID Decorator
 *
 * Extracts correlation ID from request context
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getData(@CorrelationId() correlationId: string) {
 *   // Use correlationId
 * }
 * ```
 */
export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (
      (request as any).correlationId ||
      request.headers['x-correlation-id'] ||
      ''
    );
  },
);
