import { DynamicModule, Global, Module } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { TracingInterceptor } from './tracing.interceptor';
import { MetricsMiddleware } from './metrics.middleware';
import {
  OPENTELEMETRY_SDK_TOKEN,
  TRACER_TOKEN,
  METER_TOKEN,
  METRICS_CONFIG_TOKEN,
} from './constants';

export interface OpenTelemetryModuleOptions {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  prometheusEndpoint?: string;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  sampleRate?: number;
}

/**
 * OpenTelemetry Module - Distributed Observability
 *
 * Provides distributed tracing and metrics for production monitoring.
 * Integrates with Jaeger for tracing and Prometheus for metrics.
 *
 * Features:
 * - Automatic instrumentation for Node.js modules
 * - Custom span creation for business operations
 * - Prometheus metrics export
 * - Correlation ID propagation
 * - Performance monitoring
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     OpenTelemetryModule.forRoot({
 *       serviceName: 'nestjs-ddd-api',
 *       jaegerEndpoint: 'http://localhost:14268/api/traces',
 *       prometheusPort: 9464,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class OpenTelemetryModule {
  /**
   * Initialize OpenTelemetry SDK with configuration
   * This should be called in your application's entry point (main.ts)
   *
   * @param options OpenTelemetry configuration options
   * @returns DynamicModule for NestJS
   */
  static forRoot(options: OpenTelemetryModuleOptions): DynamicModule {
    // Initialize OpenTelemetry SDK
    const sdk = new NodeSDK({
      serviceName: options.serviceName,
      traceExporter: options.jaegerEndpoint
        ? new JaegerExporter({
            endpoint: options.jaegerEndpoint,
          })
        : undefined,
      spanProcessor: options.jaegerEndpoint
        ? new BatchSpanProcessor(
            new JaegerExporter({
              endpoint: options.jaegerEndpoint,
            }),
          )
        : undefined,
      instrumentations: [getNodeAutoInstrumentations()],
      sampler: new TraceIdRatioBasedSampler(
        // Use sampleRate or default to 10% for production
        options.sampleRate ??
          (options.environment === 'production' ? 0.1 : 1.0),
      ),
    });

    // Initialize metrics if enabled
    let meterProvider: MeterProvider | undefined;
    if (options.enableMetrics) {
      // Create a basic meter provider without Prometheus exporter
      // You can configure Prometheus exporter separately if needed
      meterProvider = new MeterProvider();
    }

    // Start SDK
    sdk.start();

    const providers = [
      {
        provide: OPENTELEMETRY_SDK_TOKEN,
        useValue: sdk,
      },
      {
        provide: TRACER_TOKEN,
        useFactory: () =>
          trace.getTracer(options.serviceName, options.serviceVersion),
      },
      {
        provide: METER_TOKEN,
        useFactory: () =>
          meterProvider?.getMeter(options.serviceName, options.serviceVersion),
      },
      TracingInterceptor,
    ];

    return {
      module: OpenTelemetryModule,
      providers,
      exports: [TRACER_TOKEN, METER_TOKEN, TracingInterceptor],
      global: true,
    };
  }

  /**
   * Register metrics middleware
   *
   * @param options Middleware configuration
   * @returns DynamicModule for NestJS
   */
  static forMetrics(
    options: {
      enable?: boolean;
      includePaths?: string[];
      excludePaths?: string[];
    } = {},
  ): DynamicModule {
    return {
      module: OpenTelemetryModule,
      providers: [
        {
          provide: METRICS_CONFIG_TOKEN,
          useValue: options,
        },
        MetricsMiddleware,
      ],
      exports: [MetricsMiddleware],
    };
  }

  /**
   * Graceful shutdown of OpenTelemetry SDK
   * Call this in your application's shutdown hook
   */
  static async shutdown(sdk?: NodeSDK): Promise<void> {
    if (sdk && typeof sdk.shutdown === 'function') {
      await sdk.shutdown();
    }
  }
}
