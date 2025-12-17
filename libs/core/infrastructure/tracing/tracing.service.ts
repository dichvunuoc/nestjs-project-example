import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ITracingService,
  ISpan,
  SpanOptions,
  SpanKind,
  SpanStatus,
  SpanStatusCode,
  SpanContext,
} from './tracing.interface';

/**
 * Tracing Service
 * 
 * OpenTelemetry tracing service wrapper
 * 
 * Dependencies required:
 * - @opentelemetry/api: npm install @opentelemetry/api
 * - @opentelemetry/sdk-node: npm install @opentelemetry/sdk-node
 * - @opentelemetry/instrumentation-http: npm install @opentelemetry/instrumentation-http
 * - @opentelemetry/instrumentation-fastify: npm install @opentelemetry/instrumentation-fastify
 * 
 * Environment variables:
 * - OTEL_SERVICE_NAME: nestjs-app
 * - OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318 (optional)
 * - OTEL_TRACES_EXPORTER: console, otlp, jaeger (default: console)
 */
@Injectable()
export class TracingService implements ITracingService, OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private tracer: any = null;
  private context: any = null;
  private initialized = false;

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize OpenTelemetry
   */
  private async initialize(): Promise<void> {
    try {
      // Dynamic import để tránh lỗi nếu OpenTelemetry chưa được cài
      const { trace, context, SpanKind: OTelSpanKind, SpanStatusCode: OTelSpanStatusCode } = await import('@opentelemetry/api');
      
      const serviceName = process.env.OTEL_SERVICE_NAME || 'nestjs-app';
      this.tracer = trace.getTracer(serviceName);
      this.context = context;
      
      this.initialized = true;
      this.logger.log(`Tracing initialized for service: ${serviceName}`);
    } catch (error) {
      this.logger.warn(
        'OpenTelemetry not available. Tracing will be disabled.',
        error instanceof Error ? error.message : String(error),
      );
      // Create no-op implementation
      this.tracer = this.createNoOpTracer();
    }
  }

  /**
   * Create no-op tracer for when OpenTelemetry is not available
   */
  private createNoOpTracer(): any {
    return {
      startSpan: (name: string) => this.createNoOpSpan(),
    };
  }

  /**
   * Create no-op span
   */
  private createNoOpSpan(): ISpan {
    return {
      setAttribute: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      setStatus: () => {},
      end: () => {},
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
      }),
    };
  }

  startSpan(name: string, options?: SpanOptions): ISpan {
    if (!this.initialized || !this.tracer) {
      return this.createNoOpSpan();
    }

    try {
      const spanOptions: any = {
        kind: this.mapSpanKind(options?.kind),
        attributes: options?.attributes || {},
      };

      if (options?.parent) {
        // Set parent context
        const parentContext = this.createContextFromSpanContext(options.parent);
        spanOptions.parent = parentContext;
      }

      const span = this.tracer.startSpan(name, spanOptions);

      return this.wrapSpan(span);
    } catch (error) {
      this.logger.error('Error starting span:', error);
      return this.createNoOpSpan();
    }
  }

  getCurrentSpan(): ISpan | undefined {
    if (!this.initialized || !this.context) {
      return undefined;
    }

    try {
      // Synchronous access to current span
      const { trace } = require('@opentelemetry/api');
      const activeSpan = trace.getActiveSpan();
      return activeSpan ? this.wrapSpan(activeSpan) : undefined;
    } catch {
      return undefined;
    }
  }

  setSpanContext(context: SpanContext): void {
    // Implementation depends on OpenTelemetry context propagation
    // This is a simplified version
    this.logger.debug('Setting span context', context);
  }

  getSpanContext(): SpanContext | undefined {
    const span = this.getCurrentSpan();
    return span?.spanContext();
  }

  /**
   * Wrap OpenTelemetry span
   */
  private wrapSpan(span: any): ISpan {
    const { SpanStatusCode: OTelSpanStatusCode } = require('@opentelemetry/api');
    
    return {
      setAttribute: (key: string, value: string | number | boolean) => {
        span.setAttribute(key, value);
      },
      setAttributes: (attributes: Record<string, string | number | boolean>) => {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      },
      addEvent: (name: string, attributes?: Record<string, any>) => {
        span.addEvent(name, attributes);
      },
      setStatus: (status: SpanStatus) => {
        span.setStatus({
          code: status.code === SpanStatusCode.ERROR ? OTelSpanStatusCode.ERROR : OTelSpanStatusCode.OK,
          message: status.message,
        });
      },
      end: () => {
        span.end();
      },
      spanContext: () => {
        const ctx = span.spanContext();
        return {
          traceId: ctx.traceId,
          spanId: ctx.spanId,
          traceFlags: ctx.traceFlags,
        };
      },
    };
  }

  /**
   * Map span kind
   */
  private mapSpanKind(kind?: SpanKind): number {
    if (!kind) return 0; // INTERNAL
    
    const { SpanKind: OTelSpanKind } = require('@opentelemetry/api');
    
    switch (kind) {
      case SpanKind.SERVER:
        return OTelSpanKind.SERVER;
      case SpanKind.CLIENT:
        return OTelSpanKind.CLIENT;
      case SpanKind.PRODUCER:
        return OTelSpanKind.PRODUCER;
      case SpanKind.CONSUMER:
        return OTelSpanKind.CONSUMER;
      default:
        return OTelSpanKind.INTERNAL;
    }
  }

  /**
   * Create context from span context
   */
  private createContextFromSpanContext(spanContext: SpanContext): any {
    // Simplified - actual implementation would use OpenTelemetry context propagation
    return spanContext;
  }
}
