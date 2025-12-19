import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  IRequestContext,
  IRequestContextProvider,
  REQUEST_CONTEXT_TOKEN,
} from '../../core';

/**
 * Request Context Implementation
 */
class RequestContext implements IRequestContext {
  constructor(
    public readonly correlationId: string,
    public readonly causationId?: string,
    public readonly userId?: string,
    public readonly tenantId?: string,
    public readonly timestamp: Date = new Date(),
    public readonly metadata?: Record<string, unknown>,
  ) {}

  /**
   * Create a child context with causation tracking
   */
  createChild(causationId: string): RequestContext {
    return new RequestContext(
      this.correlationId,
      causationId,
      this.userId,
      this.tenantId,
      new Date(),
      this.metadata,
    );
  }
}

/**
 * Request Context Provider Implementation
 *
 * Uses AsyncLocalStorage for request-scoped context management.
 * This allows accessing request context anywhere in the call stack
 * without explicitly passing it through every function.
 *
 * ## Usage
 *
 * ### In Middleware/Interceptor (setup context)
 * ```typescript
 * @Injectable()
 * export class CorrelationIdMiddleware implements NestMiddleware {
 *   constructor(
 *     @Inject(REQUEST_CONTEXT_TOKEN)
 *     private readonly contextProvider: IRequestContextProvider,
 *   ) {}
 *
 *   use(req: Request, res: Response, next: NextFunction) {
 *     const correlationId = req.headers['x-correlation-id'] || randomUUID();
 *     const context = this.contextProvider.create(correlationId);
 *
 *     this.contextProvider.run(context, () => {
 *       res.setHeader('x-correlation-id', correlationId);
 *       next();
 *     });
 *   }
 * }
 * ```
 *
 * ### In Command Handler (use context)
 * ```typescript
 * async execute(command: CreateProductCommand): Promise<string> {
 *   const context = this.contextProvider.current();
 *
 *   product.addDomainEvent(new ProductCreatedEvent(
 *     product.id,
 *     data,
 *     {
 *       correlationId: context?.correlationId,
 *       userId: context?.userId,
 *     }
 *   ));
 * }
 * ```
 */
@Injectable()
export class RequestContextProvider implements IRequestContextProvider {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Get current request context
   */
  current(): IRequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Run callback within a specific context
   */
  run<T>(context: IRequestContext, callback: () => T): T {
    const requestContext =
      context instanceof RequestContext
        ? context
        : new RequestContext(
            context.correlationId,
            context.causationId,
            context.userId,
            context.tenantId,
            context.timestamp,
            context.metadata,
          );

    return this.storage.run(requestContext, callback);
  }

  /**
   * Create a new request context
   */
  create(correlationId?: string, userId?: string): IRequestContext {
    return new RequestContext(
      correlationId || randomUUID(),
      undefined,
      userId,
      undefined,
      new Date(),
    );
  }

  /**
   * Create context with full options
   */
  createFull(options: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    tenantId?: string;
    metadata?: Record<string, unknown>;
  }): IRequestContext {
    return new RequestContext(
      options.correlationId || randomUUID(),
      options.causationId,
      options.userId,
      options.tenantId,
      new Date(),
      options.metadata,
    );
  }
}

/**
 * Provider configuration for dependency injection
 */
export const RequestContextProviderToken = {
  provide: REQUEST_CONTEXT_TOKEN,
  useClass: RequestContextProvider,
};
