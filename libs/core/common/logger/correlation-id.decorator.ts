import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * Correlation ID Decorator
 * 
 * Get correlation ID from request
 * 
 * Usage:
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
    return (request as any).correlationId || '';
  },
);
