import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError, throwError } from 'rxjs';
import {
  Span,
  SpanStatusCode,
  type Tracer,
  context as otelContext,
  trace,
} from '@opentelemetry/api';
import { FastifyRequest } from 'fastify';
import { TRACER_TOKEN, SPAN_NAMES, ATTRIBUTE_KEYS } from './constants';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';

/**
 * Distributed Tracing Interceptor
 *
 * Automatically creates OpenTelemetry spans for all incoming requests and command handlers.
 * Captures request/response details, errors, and performance metrics.
 *
 * Features:
 * - Automatic span creation for HTTP requests
 * - Command/Query handler tracing
 * - Correlation ID propagation
 * - Error capturing in spans
 * - Performance measurement
 * - Custom span attributes
 *
 * Usage:
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: TracingInterceptor,
 *     },
 *   ],
 * })
 * export class CoreModule {}
 * ```
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer: Tracer;

  constructor(
    @Inject(TRACER_TOKEN) tracer: Tracer,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {
    this.tracer = tracer;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get request context for correlation
    const requestContext = this.requestContext?.current();

    // Determine span name based on context type
    const spanName = this.getSpanName(context);

    // Create root span
    const span = this.tracer.startSpan(spanName, {
      attributes: this.getInitialAttributes(context, requestContext),
    });

    // Set span in context for child spans
    const ctx = trace.setSpan(otelContext.active(), span);

    return next.handle().pipe(
      // Record success metrics
      tap((response) => {
        this.recordSuccess(span, context, response);
        span.end();
      }),
      // Record error metrics
      catchError((error) => {
        this.recordError(span, error);
        span.end();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Determine span name based on execution context
   */
  private getSpanName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    // HTTP Controller
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<FastifyRequest>();
      return `${SPAN_NAMES.HTTP_CONTROLLER}.${controller.name}.${handler.name}`;
    }

    // Command/Query Handler
    if (this.isCommandHandler(handler) || this.isQueryHandler(handler)) {
      const operationType = this.isCommandHandler(handler)
        ? 'command'
        : 'query';
      return `${SPAN_NAMES.COMMAND_HANDLER}.${operationType}.${handler.name}`;
    }

    // Event Handler
    if (this.isEventHandler(handler)) {
      return `${SPAN_NAMES.EVENT_HANDLER}.${handler.name}`;
    }

    // Default
    return `${controller.name}.${handler.name}`;
  }

  /**
   * Get initial span attributes
   */
  private getInitialAttributes(
    context: ExecutionContext,
    requestContext?: any,
  ): Record<string, string | number> {
    const handler = context.getHandler();
    const attributes: Record<string, string | number> = {};

    // Add handler information
    attributes[ATTRIBUTE_KEYS.OPERATION_NAME] = handler.name;
    attributes[ATTRIBUTE_KEYS.OPERATION_TYPE] = this.getOperationType(handler);

    // Add request context if available
    if (requestContext) {
      if (requestContext.correlationId) {
        attributes[ATTRIBUTE_KEYS.CORRELATION_ID] =
          requestContext.correlationId;
      }
      if (requestContext.userId) {
        attributes[ATTRIBUTE_KEYS.USER_ID] = requestContext.userId;
      }
      if (requestContext.causationId) {
        attributes[ATTRIBUTE_KEYS.CAUSATION_ID] = requestContext.causationId;
      }
    }

    // HTTP specific attributes
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<FastifyRequest>();

      attributes[ATTRIBUTE_KEYS.HTTP_METHOD] = request.method;
      attributes[ATTRIBUTE_KEYS.HTTP_URL] = request.url;
      attributes[ATTRIBUTE_KEYS.HTTP_USER_AGENT] =
        request.headers['user-agent'] || '';
    }

    // Command/Query specific attributes
    if (this.isCommandHandler(handler)) {
      attributes[ATTRIBUTE_KEYS.COMMAND_NAME] = this.getCommandName(handler);
    } else if (this.isQueryHandler(handler)) {
      attributes[ATTRIBUTE_KEYS.QUERY_NAME] = this.getQueryName(handler);
    }

    return attributes;
  }

  /**
   * Record success metrics and attributes
   */
  private recordSuccess(
    span: Span,
    context: ExecutionContext,
    response: any,
  ): void {
    span.setStatus({ code: SpanStatusCode.OK });

    // HTTP specific
    if (context.getType() === 'http') {
      const httpResponse = context.switchToHttp().getResponse();
      span.setAttributes({
        [ATTRIBUTE_KEYS.HTTP_STATUS_CODE]: httpResponse.statusCode,
      });
    }

    // Business specific attributes from response
    if (response?.data) {
      this.addBusinessAttributes(span, response.data);
    }
  }

  /**
   * Record error in span
   */
  private recordError(span: Span, error: Error): void {
    span.recordException({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    span.setAttributes({
      [ATTRIBUTE_KEYS.ERROR_TYPE]: error.constructor.name,
      [ATTRIBUTE_KEYS.ERROR_MESSAGE]: error.message,
    });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }

  /**
   * Add business-specific attributes to span
   */
  private addBusinessAttributes(span: Span, data: any): void {
    if (data.id) {
      // Try to identify entity type
      if (data.price && data.stock) {
        // Product
        span.setAttribute(ATTRIBUTE_KEYS.PRODUCT_ID, data.id);
        if (data.category) {
          span.setAttribute(ATTRIBUTE_KEYS.CATEGORY, data.category);
        }
      } else if (data.items) {
        // Order
        span.setAttribute(ATTRIBUTE_KEYS.ORDER_ID, data.id);
      }
    }
  }

  /**
   * Helper methods to determine operation types
   */
  private getOperationType(handler: any): string {
    if (this.isCommandHandler(handler)) return 'command';
    if (this.isQueryHandler(handler)) return 'query';
    if (this.isEventHandler(handler)) return 'event';
    return 'unknown';
  }

  private isCommandHandler(handler: any): boolean {
    return (
      handler.constructor?.name?.includes('Command') ||
      handler.name?.toLowerCase().includes('command')
    );
  }

  private isQueryHandler(handler: any): boolean {
    return (
      handler.constructor?.name?.includes('Query') ||
      handler.name?.toLowerCase().includes('query')
    );
  }

  private isEventHandler(handler: any): boolean {
    return (
      handler.constructor?.name?.includes('Event') ||
      handler.name?.toLowerCase().includes('event')
    );
  }

  private getCommandName(handler: any): string {
    // Extract command name from handler name
    const match = handler.name.match(/(\w+)Handler/);
    return match ? match[1] : handler.name;
  }

  private getQueryName(handler: any): string {
    // Extract query name from handler name
    const match = handler.name.match(/(\w+)Handler/);
    return match ? match[1] : handler.name;
  }
}
