import { Global, Module } from '@nestjs/common';
import { REQUEST_CONTEXT_TOKEN } from '../../core';
import { RequestContextProvider } from './request-context.provider';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

/**
 * Context Module
 *
 * Provides request context management with:
 * - Correlation ID for distributed tracing
 * - User context from authentication
 * - Tenant context for multi-tenancy
 *
 * ## Setup
 *
 * 1. Import ContextModule in AppModule
 * 2. Apply CorrelationIdMiddleware to routes
 *
 * ```typescript
 * @Module({
 *   imports: [ContextModule],
 * })
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(CorrelationIdMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [
    RequestContextProvider,
    {
      provide: REQUEST_CONTEXT_TOKEN,
      useExisting: RequestContextProvider,
    },
    CorrelationIdMiddleware,
  ],
  exports: [
    REQUEST_CONTEXT_TOKEN,
    RequestContextProvider,
    CorrelationIdMiddleware,
  ],
})
export class ContextModule {}
