# 🏗️ NESTJS DDD/CQRS ARCHITECTURAL IMPROVEMENTS - INTEGRATION GUIDE

## 📋 OVERVIEW

This guide provides step-by-step instructions for integrating the new architectural improvements into your NestJS DDD/CQRS application. The improvements address Priority 1 and Priority 2 items from the architectural review:

- ✅ **Observability & Distributed Tracing**
- ✅ **Security Implementation**
- ✅ **Resilience Patterns**
- ✅ **Enhanced Error Handling**

## 🚀 QUICK START

### 1. Install Dependencies

```bash
# Observability
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger @opentelemetry/exporter-prometheus @opentelemetry/semantic-conventions

# Logging
npm install pino pino-pretty

# Validation
npm install zod

# Existing packages should already include NestJS, Drizzle, etc.
```

### 2. Update Main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OpenTelemetryModule } from './libs/shared/observability/opentelemetry.module';

// Initialize OpenTelemetry FIRST (before any imports that might be instrumented)
OpenTelemetryModule.forRoot({
  serviceName: 'nestjs-ddd-api',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9464,
  enableMetrics: true,
  enableTracing: true,
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Let structured logger handle info/debug
  });

  // Apply global interceptors and filters
  app.useGlobalInterceptors(
    app.get(TracingInterceptor),
    app.get(LoggingInterceptor),
    app.get(AuditLoggerInterceptor),
  );

  app.useGlobalFilters(
    new StructuredErrorFilter(
      app.get(StructuredLogger),
      app.get(REQUEST_CONTEXT_TOKEN),
    ),
  );

  app.useGlobalPipes(
    new ZodValidationPipe(app.get(StructuredLogger), {
      transform: true,
      detailedErrors: process.env.NODE_ENV !== 'production',
    }),
  );

  // Apply global guards
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new RolesGuard(reflector),
    new PermissionsGuard(reflector, app.get(REQUEST_CONTEXT_TOKEN)),
    new ResourceGuard(reflector, app.get(REQUEST_CONTEXT_TOKEN)),
    new RateLimitGuard(reflector, app.get(CACHE_SERVICE_TOKEN)),
  );

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

### 3. Update App Module

```typescript
// src/app.module.ts
import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

// Existing imports...
import {
  SharedCqrsModule,
  LoggingModule,
  HealthModule,
  DrizzleDatabaseModule,
  DrizzleUnitOfWork,
  UNIT_OF_WORK_TOKEN,
  OutboxModule,
  schema,
  ContextModule,
  CorrelationIdMiddleware,
} from 'src/libs/shared';

// New imports for enhancements
import {
  OpenTelemetryModule,
  TracingInterceptor,
  LoggingInterceptor,
  StructuredLogger,
  MetricsMiddleware,
} from 'src/libs/shared/observability';
import {
  StructuredErrorFilter,
} from 'src/libs/shared/errors';
import {
  ZodValidationPipe,
} from 'src/libs/shared/validation';
import {
  RolesGuard,
  PermissionsGuard,
  ResourceGuard,
  RateLimitGuard,
} from 'src/libs/shared/security';
import {
  CircuitBreakerInterceptor,
  RetryInterceptor,
  CircuitBreakerService,
} from 'src/libs/shared/resilience';
import {
  AuditLoggerInterceptor,
} from 'src/libs/shared/security/audit-logger.interceptor';

@Global()
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // Observability
    LoggingModule,
    ContextModule,
    OpenTelemetryModule.forMetrics({
      enable: true,
      excludePaths: ['/health', '/metrics'],
    }),

    // Existing modules
    SharedCqrsModule,
    DrizzleDatabaseModule.forRoot({
      schema,
      unitOfWorkProvider: {
        provide: UNIT_OF_WORK_TOKEN,
        useClass: DrizzleUnitOfWork,
      },
    }),
    OutboxModule,
    HealthModule,

    // Feature modules
    ProductModule,
    OrderModule,
  ],
  providers: [
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CircuitBreakerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RetryInterceptor,
    },

    // Global filters
    {
      provide: APP_FILTER,
      useClass: StructuredErrorFilter,
    },

    // Global pipes
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },

    // Global guards
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },

    // Services
    CircuitBreakerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');

    consumer
      .apply(MetricsMiddleware)
      .forRoutes('*');
  }
}
```

## 🔧 COMPONENT INTEGRATION

### 1. OBSERVABILITY INTEGRATION

#### Command Handlers

```typescript
// Update your command handlers
import { StructuredLogger } from 'src/libs/shared/observability/structured-logger.service';
import { Tracer } from '@opentelemetry/api';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand, string> {
  constructor(
    // Existing dependencies...
    @Optional() private readonly logger?: StructuredLogger,
    @Optional() private readonly tracer?: Tracer,
  ) {}

  async execute(command: CreateProductCommand): Promise<string> {
    const span = this.tracer?.startSpan('CreateProductHandler.execute');
    const startTime = Date.now();

    try {
      // Log operation start
      this.logger?.logOperationStart('CreateProduct', {
        commandName: 'CreateProductCommand',
        productId: command.id,
      });

      // Your existing logic...
      const result = await this.createProductLogic(command);

      // Log success
      this.logger?.logOperationEnd('CreateProduct', startTime, result);

      return result;

    } catch (error) {
      span?.recordException(error);
      this.logger?.error('CreateProduct failed', error as Error, {
        commandName: 'CreateProductCommand',
        productId: command.id,
      });
      throw error;
    } finally {
      span?.end();
    }
  }
}
```

#### HTTP Controllers

```typescript
// Controllers are automatically instrumented by interceptors
@Controller('products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Optional() private readonly logger?: StructuredLogger,
  ) {}

  @Post()
  async create(@Body() createDto: CreateProductDto): Promise<ResponseDto<string>> {
    this.logger?.info('Creating product via HTTP', {
      operation: 'ProductController.create',
      data: { name: createDto.name },
    });

    const productId = await this.commandBus.execute(
      new CreateProductCommand(createDto),
    );

    return ResponseDto.success(productId);
  }
}
```

### 2. SECURITY INTEGRATION

#### Apply Security Decorators

```typescript
// Update your controllers and handlers
import {
  RequirePermission,
  RequireRole,
  RequireResource,
  RateLimit,
  AuditLogCreation,
  Secure
} from 'src/libs/shared/security';

@Secure({
  roles: [Role.USER, Role.ADMIN],
  permissions: ['product:read'],
})
@Controller('products')
@RateLimit({ limit: 100, windowMs: 60 }) // 100 requests per minute
export class ProductController {

  @Post()
  @RequirePermission('product:create')
  @AuditLogCreation('product')
  @RateLimit({ limit: 10, windowMs: 60 }) // Stricter limit for creation
  async create(@Body() createDto: CreateProductDto) {
    // Handler implementation
  }

  @Get(':id')
  @RequireResource('product', ResourceAccess.READ)
  async findOne(@Param('id') id: string) {
    // Only accessible if user owns the product or has read permission
  }

  @Delete(':id')
  @RequireRole(Role.ADMIN)
  @RequirePermission('product:delete')
  @AuditLog({ action: 'product.deleted', resource: 'product' })
  async remove(@Param('id') id: string) {
    // Only admins can delete products
  }
}
```

#### Command Handler Security

```typescript
@CommandHandler(UpdateProductCommand)
@RequirePermission('product:update')
@AuditLog({
  action: 'product.updated',
  resource: 'product',
  logRequestBody: true,
})
@Retry({ maxAttempts: 2, retryableErrors: ['DatabaseConnectionError'] })
export class UpdateProductHandler {
  // Implementation with automatic security and audit logging
}
```

### 3. RESILIENCE INTEGRATION

#### Circuit Breaker for External Services

```typescript
import { CircuitBreaker, CircuitBreakerConfigs } from 'src/libs/shared/resilience';

@Injectable()
export class PaymentService {
  @CircuitBreaker(CircuitBreakerConfigs.ExternalAPI)
  async processPayment(payment: PaymentDto): Promise<PaymentResult> {
    // This method is protected by circuit breaker
    // Will open after 50% failures in 60-second window
    // Will use fallback if circuit is open
  }

  @CircuitBreaker({
    timeout: 30000,
    errorThreshold: 30,
    fallback: () => ({ status: 'service_unavailable' }),
  })
  async refundPayment(paymentId: string): Promise<RefundResult> {
    // Custom circuit breaker configuration
  }
}
```

#### Retry for Transient Failures

```typescript
import { Retry, RetryConfigs } from 'src/libs/shared/resilience';

@Injectable()
export class EmailService {
  @Retry(RetryConfigs.ExternalAPI)
  async sendEmail(email: EmailDto): Promise<void> {
    // Will retry on network errors up to 3 times
    // Uses exponential backoff with jitter
  }

  @Retry({
    maxAttempts: 5,
    initialDelayMs: 2000,
    shouldRetry: (error) => error.status >= 500,
  })
  async sendCriticalNotification(notification: NotificationDto): Promise<void> {
    // Custom retry configuration
  }
}
```

### 4. ERROR HANDLING INTEGRATION

#### Domain Exceptions

```typescript
// Replace generic errors with domain-specific exceptions
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
  DuplicateResourceException,
  ConcurrentModificationException,
} from 'src/libs/shared/errors/domain-exception.base';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler {
  async execute(command: UpdateProductCommand): Promise<void> {
    const product = await this.repository.getById(command.id);

    if (!product) {
      throw new ResourceNotFoundException('Product', command.id, {
        userMessage: 'The product you\'re trying to update doesn\'t exist',
      });
    }

    if (product.version !== command.expectedVersion) {
      throw new ConcurrentModificationException('Product', command.id, {
        suggestedAction: 'Refresh the product and try again',
      });
    }

    // Business logic...
  }
}
```

## 📊 MONITORING SETUP

### 1. Jaeger Setup

```yaml
# docker-compose.yml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # HTTP collector
    environment:
      - COLLECTOR_ZIPKIN_HTTP_PORT=9411
```

### 2. Prometheus Setup

```yaml
# docker-compose.yml (continued)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nestjs-ddd-api'
    static_configs:
      - targets: ['localhost:9464']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### 3. Environment Variables

```bash
# .env
# Service Configuration
SERVICE_NAME=nestjs-ddd-api
SERVICE_VERSION=1.0.0
NODE_ENV=production
PORT=3000

# Observability
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:14268/api/traces
PROMETHEUS_PORT=9464

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
RATE_LIMIT_REDIS_URL=redis://localhost:6379
```

## 🧪 TESTING INTEGRATION

### 1. Unit Tests with Mocks

```typescript
// product.handler.spec.ts
describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let mockLogger: jest.Mocked<StructuredLogger>;
  let mockTracer: jest.Mocked<Tracer>;

  beforeEach(async () => {
    mockLogger = {
      logOperationStart: jest.fn(),
      logOperationEnd: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockTracer = {
      startSpan: jest.fn().mockReturnValue({
        setAttributes: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
      }),
    } as any;

    handler = new CreateProductHandler(
      mockRepository,
      mockUniquenessChecker,
      mockRequestContext,
      mockLogger,
      mockTracer,
    );
  });

  it('should log operation start and end', async () => {
    const command = new CreateProductCommand({ name: 'Test Product' });

    await handler.execute(command);

    expect(mockLogger.logOperationStart).toHaveBeenCalledWith('CreateProduct', expect.any(Object));
    expect(mockLogger.logOperationEnd).toHaveBeenCalledWith('CreateProduct', expect.any(Number), expect.any(Object));
  });
});
```

### 2. Integration Tests with Observability

```typescript
// product.integration.spec.ts
describe('Product Integration with Observability', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should create product with audit trail', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Test Product',
        priceAmount: 99.99,
        stock: 10,
        category: 'Test',
      })
      .expect(201);

    expect(response.body.data).toHaveProperty('id');

    // Verify audit log was created
    const auditLogs = await getAuditLogs('product.created');
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: 'product.created',
      resource: 'product',
      status: 'success',
    });
  });

  it('should respect rate limiting', async () => {
    // Make 11 requests (limit is 10)
    const promises = Array(11).fill(null).map(() =>
      request(app.getHttpServer()).post('/products').send({
        name: `Product ${Date.now()}`,
        priceAmount: 10,
        stock: 1,
        category: 'Test',
      }),
    );

    const responses = await Promise.allSettled(promises);
    const failures = responses.filter(r => r.status === 'rejected' &&
      (r.reason as any).response?.status === 429);

    expect(failures.length).toBeGreaterThan(0);
  });
});
```

## ✅ PRODUCTION CHECKLIST

### Before Deployment

- [ ] Configure Jaeger endpoint
- [ ] Set up Prometheus metrics collection
- [ ] Configure log aggregation (ELK/Datadog)
- [ ] Set up alerts for high error rates
- [ ] Configure Redis for rate limiting
- [ ] Set environment variables
- [ ] Update CORS configuration
- [ ] Configure security headers (Helmet.js)

### Monitoring Setup

- [ ] Dashboard for request latency
- [ ] Dashboard for error rates
- [ ] Dashboard for circuit breaker status
- [ ] Alert for high error rate (>5%)
- [ ] Alert for circuit breaker open
- [ ] Log alerts for critical errors

### Security Verification

- [ ] Test RBAC permissions
- [ ] Verify rate limiting works
- [ ] Check audit logs are created
- [ ] Validate input sanitization
- [ ] Test authentication flows

### Performance Verification

- [ ] Load test with observability enabled
- [ ] Verify circuit breaker under load
- [ ] Check retry behavior
- [ ] Monitor memory usage
- [ ] Validate structured logging performance

## 🔄 MIGRATION PATH

### Phase 1: Core Infrastructure
1. Install dependencies
2. Update main.ts and app.module.ts
3. Configure OpenTelemetry
4. Set up structured logging

### Phase 2: Security
1. Add RBAC decorators to controllers
2. Implement rate limiting
3. Add audit logging
4. Update authentication middleware

### Phase 3: Resilience
1. Add circuit breakers to external service calls
2. Implement retry for transient failures
3. Add fallback strategies
4. Set up health checks

### Phase 4: Error Handling
1. Replace generic errors with domain exceptions
2. Implement structured error responses
3. Add error logging and monitoring
4. Create error recovery procedures

### Phase 5: Monitoring & Operations
1. Set up dashboards
2. Configure alerts
3. Document runbooks
4. Train team on new observability tools

## 📚 ADDITIONAL RESOURCES

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Pino Logger](https://getpino.io/)
- [NestJS Security](https://docs.nestjs.com/security)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Domain-Driven Design](https://domain-driven-design.org/)

---

## 🎯 CONCLUSION

By following this integration guide, you'll successfully enhance your NestJS DDD/CQRS application with enterprise-grade observability, security, resilience, and error handling. The improvements ensure your application is production-ready with proper monitoring, security controls, and fault tolerance.

Remember to:
1. Test thoroughly in development first
2. Monitor performance impact
3. Update your team on new patterns
4. Document your specific configurations
5. Plan for ongoing maintenance