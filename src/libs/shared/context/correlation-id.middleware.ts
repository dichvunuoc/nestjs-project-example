import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import {
  type IRequestContextProvider,
  REQUEST_CONTEXT_TOKEN,
} from '../../core';

/**
 * Correlation ID Header name
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Correlation ID Middleware
 *
 * Middleware that:
 * 1. Extracts or generates correlation ID from request headers
 * 2. Sets up request context with correlation ID
 * 3. Adds correlation ID to response headers
 *
 * This enables distributed tracing across services.
 *
 * ## Usage
 *
 * ### In AppModule
 * ```typescript
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(CorrelationIdMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * ```
 *
 * ### In HTTP Client (propagate to other services)
 * ```typescript
 * const context = this.contextProvider.current();
 * const response = await axios.get(url, {
 *   headers: {
 *     'x-correlation-id': context?.correlationId,
 *   },
 * });
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly contextProvider: IRequestContextProvider,
  ) {}

  use(
    req: FastifyRequest['raw'] & { headers: Record<string, string | string[]> },
    res: FastifyReply['raw'],
    next: () => void,
  ) {
    // Get correlation ID from header or generate new one
    const correlationId = this.extractCorrelationId(req) || randomUUID();

    // Extract user ID from JWT or session (if available)
    const userId = this.extractUserId(req);

    // Create request context
    const context = this.contextProvider.create(correlationId, userId);

    // Add correlation ID to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Run the rest of the request within this context
    this.contextProvider.run(context, () => {
      next();
    });
  }

  /**
   * Extract correlation ID from request headers
   */
  private extractCorrelationId(req: {
    headers: Record<string, string | string[]>;
  }): string | undefined {
    const header = req.headers[CORRELATION_ID_HEADER];
    if (Array.isArray(header)) {
      return header[0];
    }
    return header;
  }

  /**
   * Extract user ID from request (override for custom auth)
   */
  private extractUserId(_req: {
    headers: Record<string, string | string[]>;
  }): string | undefined {
    // Default implementation - override in subclass for JWT/session
    // Example: return req.user?.id;
    return undefined;
  }
}
