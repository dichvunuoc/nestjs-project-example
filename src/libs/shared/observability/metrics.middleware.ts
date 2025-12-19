import { Injectable, NestMiddleware, Inject, Optional } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { performance } from 'perf_hooks';
import { METER_TOKEN, METRICS_NAMES, ATTRIBUTE_KEYS, METRICS_CONFIG_TOKEN } from './constants';

/**
 * HTTP Metrics Middleware
 *
 * Automatically collects Prometheus metrics for all HTTP requests.
 * Measures request duration, count, and sizes.
 *
 * Metrics collected:
 * - http_request_duration_seconds: Request processing time
 * - http_requests_total: Total request count with status codes
 * - http_request_size_bytes: Incoming request size
 * - http_response_size_bytes: Outgoing response size
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [OpenTelemetryModule.forMetrics()],
 * })
 * export class AppModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(MetricsMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private httpDuration: any;
  private httpRequestsTotal: any;
  private httpRequestSize: any;
  private httpResponseSize: any;

  constructor(
    @Optional()
    @Inject(METER_TOKEN)
    private readonly meter?: any,
    @Optional()
    @Inject(METRICS_CONFIG_TOKEN)
    private readonly config?: {
      enable?: boolean;
      includePaths?: string[];
      excludePaths?: string[];
    },
  ) {
    this.initializeMetrics();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    if (!this.meter || this.config?.enable === false) {
      return;
    }

    // Request duration histogram
    this.httpDuration = this.meter.createHistogram(
      METRICS_NAMES.HTTP_REQUEST_DURATION,
      {
        description: 'HTTP request duration in seconds',
        unit: 's',
        // Buckets: 0.001, 0.01, 0.1, 1, 10, 100 seconds
        boundaries: [0.001, 0.01, 0.1, 1, 10, 100],
      },
    );

    // Request counter
    this.httpRequestsTotal = this.meter.createCounter(
      METRICS_NAMES.HTTP_REQUEST_COUNT,
      {
        description: 'Total number of HTTP requests',
      },
    );

    // Request size histogram
    this.httpRequestSize = this.meter.createHistogram(
      METRICS_NAMES.HTTP_REQUEST_SIZE,
      {
        description: 'HTTP request size in bytes',
        unit: 'By',
        boundaries: [100, 1000, 10000, 100000, 1000000], // 100B to 1MB
      },
    );

    // Response size histogram
    this.httpResponseSize = this.meter.createHistogram(
      METRICS_NAMES.HTTP_RESPONSE_SIZE,
      {
        description: 'HTTP response size in bytes',
        unit: 'By',
        boundaries: [100, 1000, 10000, 100000, 1000000], // 100B to 1MB
      },
    );
  }

  use(
    req: FastifyRequest,
    res: FastifyReply,
    next: (err?: Error) => void,
  ): void {
    // Skip if metrics disabled
    if (!this.meter || this.config?.enable === false) {
      return next();
    }

    // Check path filters
    if (this.shouldSkipPath(req.url)) {
      return next();
    }

    const startTime = performance.now();

    // Extract request size
    const requestSize = this.getRequestSize(req);

    // Override res.send to capture metrics
    const originalSend = res.send;
    const self = this;
    res.send = function (this: FastifyReply, ...args: any[]) {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

      // Extract response size
      const responseSize = getResponseSize(
        this.getHeader('content-length') as string,
      );

      // Record metrics
      self.recordMetrics(req, this, duration, requestSize, responseSize);

      // Call original send
      return originalSend.apply(this, args);
    };

    next();
  }

  /**
   * Check if path should be skipped based on configuration
   */
  private shouldSkipPath(path: string): boolean {
    const { includePaths, excludePaths } = this.config || {};

    // If includePaths specified, only track those paths
    if (includePaths?.length) {
      return !includePaths.some((pattern) => this.matchPath(path, pattern));
    }

    // Skip excluded paths
    if (excludePaths?.length) {
      return excludePaths.some((pattern) => this.matchPath(path, pattern));
    }

    return false;
  }

  /**
   * Match path against pattern (supports wildcards)
   */
  private matchPath(path: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    }
    return path === pattern;
  }

  /**
   * Extract request size from headers
   */
  private getRequestSize(req: FastifyRequest): number {
    const contentLength = req.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Record all metrics for the request
   */
  private recordMetrics(
    req: FastifyRequest,
    res: FastifyReply,
    duration: number,
    requestSize: number,
    responseSize: number,
  ): void {
    const attributes = this.getMetricAttributes(req, res);

    // Record request duration
    this.httpDuration?.record(duration, attributes);

    // Record request count
    this.httpRequestsTotal?.add(1, attributes);

    // Record request size (if > 0)
    if (requestSize > 0) {
      this.httpRequestSize?.record(requestSize, attributes);
    }

    // Record response size (if > 0)
    if (responseSize > 0) {
      this.httpResponseSize?.record(responseSize, attributes);
    }
  }

  /**
   * Get attributes for metrics
   */
  private getMetricAttributes(
    req: FastifyRequest,
    res: FastifyReply,
  ): Record<string, string> {
    const attributes: Record<string, string> = {};

    // HTTP attributes
    attributes[ATTRIBUTE_KEYS.HTTP_METHOD] = req.method;
    attributes[ATTRIBUTE_KEYS.HTTP_STATUS_CODE] = res.statusCode.toString();

    // Use url without query parameters
    const path = req.url.split('?')[0];
    attributes[ATTRIBUTE_KEYS.HTTP_ROUTE] = path;

    // User agent group (for aggregated metrics)
    const userAgent = req.headers['user-agent'] || '';
    attributes['http.user_agent.type'] = this.getUserAgentType(userAgent);

    return attributes;
  }

  /**
   * Categorize user agent for metrics
   */
  private getUserAgentType(userAgent: string): string {
    if (userAgent.includes('Mozilla')) return 'browser';
    if (userAgent.includes('curl')) return 'curl';
    if (userAgent.includes('Postman')) return 'postman';
    if (userAgent.includes('python-requests')) return 'python';
    if (userAgent.includes('axios')) return 'nodejs';
    return 'unknown';
  }
}

/**
 * Helper function to get response size
 */
function getResponseSize(contentLength?: string): number {
  return contentLength ? parseInt(contentLength, 10) : 0;
}
