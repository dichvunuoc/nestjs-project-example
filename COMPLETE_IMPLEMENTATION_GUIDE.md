# Hướng Dẫn Sử Dụng Đầy Đủ Các Thành Phần Production-Ready

## 📋 Tổng Quan

Document này hướng dẫn cách sử dụng TẤT CẢ các thành phần Production-ready đã được implement:
1. ✅ Structured Logging với Correlation ID
2. ✅ Configuration Management với Validation
3. ✅ Retry Policies
4. ✅ Circuit Breaker Pattern
5. ✅ Event Bus Abstraction (RabbitMQ/Kafka)
6. ✅ HTTP Client Abstraction
7. ✅ Distributed Tracing (OpenTelemetry)
8. ✅ Metrics Collection (Prometheus)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Core dependencies (required)
npm install @nestjs/axios

# Optional - Message Queue (chọn một hoặc cả hai)
npm install amqplib @types/amqplib  # RabbitMQ
npm install kafkajs                 # Kafka

# Optional - OpenTelemetry
npm install @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/instrumentation-http
npm install @opentelemetry/instrumentation-fastify

# Optional - Prometheus
npm install prom-client
```

### 2. Setup AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { AppConfigModule } from '@core/common/config';
import { LoggerModule } from '@core/common/logger';
import { MetricsModule } from '@core/common/metrics';
import { ResilienceModule } from '@core/infrastructure/resilience';
import { MessagingModule } from '@core/infrastructure/messaging';
import { HttpClientModule } from '@core/infrastructure/http';
import { TracingModule } from '@core/infrastructure/tracing';

@Module({
  imports: [
    // Config MUST be first
    AppConfigModule,
    
    // Core modules
    CoreModule,
    LoggerModule,
    ResilienceModule,
    
    // Infrastructure modules
    MessagingModule,      // Message Queue
    HttpClientModule,     // HTTP Client
    TracingModule,        // OpenTelemetry
    MetricsModule,        // Prometheus
    
    // Your feature modules
    // ...
  ],
})
export class AppModule {}
```

### 3. Setup main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, ResponseInterceptor } from '@core/common';
import {
  LoggerService,
  CorrelationIdInterceptor,
  LoggingInterceptor,
} from '@core/common/logger';
import { MetricsInterceptor } from '@core/common/metrics';
import { TracingInterceptor } from '@core/infrastructure/tracing';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services
  const logger = app.get(LoggerService);
  const tracingService = app.get(TracingService);
  const metricsService = app.get(MetricsService);

  // Global Interceptors (order matters!)
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(logger),  // 1. Correlation ID first
    new TracingInterceptor(tracingService), // 2. Tracing
    new LoggingInterceptor(logger),         // 3. Logging
    new MetricsInterceptor(metricsService),  // 4. Metrics
  );

  // Global Filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

---

## 📚 Chi Tiết Từng Thành Phần

### 1. Event Bus Abstraction (Message Queue)

#### Setup Environment Variables

```env
# .env
# Chọn message bus type: 'in-memory' | 'rabbitmq' | 'kafka'
MESSAGE_BUS_TYPE=rabbitmq

# RabbitMQ
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBITMQ_EXCHANGE=domain-events

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=nestjs-app
KAFKA_GROUP_ID=nestjs-consumer-group
```

#### Usage

```typescript
import { Injectable } from '@nestjs/common';
import { MessageBusService } from '@core/infrastructure/messaging';
import { ProductCreatedEvent } from '../domain/events';

@Injectable()
export class ProductService {
  constructor(private readonly messageBus: MessageBusService) {}

  async createProduct(data: CreateProductDto) {
    const product = new Product(data);
    
    // Publish domain event
    await this.messageBus.publish(
      new ProductCreatedEvent(product.id, product.name),
      {
        exchange: 'domain-events',
        routingKey: 'product.created',
        persistent: true,
      },
    );
  }
}

// Subscribe to events
@Injectable()
export class ProductEventHandler {
  constructor(private readonly messageBus: MessageBusService) {}

  async onModuleInit() {
    await this.messageBus.subscribe(
      'ProductCreated',
      async (event: ProductCreatedEvent) => {
        // Handle event
        console.log('Product created:', event);
      },
      {
        queue: 'product-created-handler',
        durable: true,
      },
    );
  }
}
```

#### Custom Message Bus

```typescript
// Use custom RabbitMQ implementation
@Module({
  imports: [
    MessagingModule.forRoot({
      useClass: RabbitMQMessageBus,
    }),
  ],
})
export class AppModule {}
```

---

### 2. HTTP Client Abstraction

#### Usage

```typescript
import { Injectable } from '@nestjs/common';
import { HttpClientService } from '@core/infrastructure/http';

@Injectable()
export class ExternalApiService {
  constructor(private readonly httpClient: HttpClientService) {}

  async fetchData() {
    // Simple GET request
    const data = await this.httpClient.get('https://api.example.com/data');

    // GET với retry và circuit breaker
    const result = await this.httpClient.get(
      'https://api.example.com/data',
      {
        retry: {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'exponential',
        },
        circuitBreaker: {
          name: 'external-api',
          timeout: 5000,
          errorThresholdPercentage: 50,
        },
        timeout: 5000,
      },
    );

    // POST request
    const created = await this.httpClient.post(
      'https://api.example.com/create',
      { name: 'Product' },
      {
        retry: { maxAttempts: 3 },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    return result;
  }
}
```

#### Auto Logging

HTTP Client tự động log requests/responses với correlation ID:
```
[INFO] [HttpClientService] HTTP GET https://api.example.com/data
[INFO] [HttpClientService] HTTP GET https://api.example.com/data - 200
```

---

### 3. Distributed Tracing (OpenTelemetry)

#### Setup Environment Variables

```env
# .env
OTEL_SERVICE_NAME=nestjs-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_TRACES_EXPORTER=otlp  # console, otlp, jaeger
```

#### Auto Instrumentation

TracingInterceptor tự động tạo spans cho HTTP requests. Không cần code thêm!

#### Manual Tracing

```typescript
import { Injectable } from '@nestjs/common';
import { TracingService, SpanKind } from '@core/infrastructure/tracing';
import { Trace } from '@core/infrastructure/tracing';

@Injectable()
export class ProductService {
  constructor(private readonly tracing: TracingService) {}

  @Trace({ kind: SpanKind.CLIENT })
  async callExternalService() {
    const span = this.tracing.startSpan('external-service-call', {
      kind: SpanKind.CLIENT,
      attributes: {
        'service.name': 'external-api',
        'operation': 'fetch-data',
      },
    });

    try {
      // Your code
      const result = await fetch('https://api.example.com/data');
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### Trace Context Propagation

TracingInterceptor tự động:
- Extract trace context từ `traceparent` header
- Inject trace context vào outgoing HTTP requests (nếu dùng HttpClientService)

---

### 4. Metrics Collection (Prometheus)

#### Auto Metrics

MetricsInterceptor tự động collect:
- `nestjs_http_requests_total` - Total requests
- `nestjs_http_request_duration_seconds` - Request duration
- `nestjs_http_active_requests` - Active requests

#### Access Metrics

```bash
# Prometheus sẽ scrape từ endpoint này
curl http://localhost:3000/metrics
```

#### Custom Metrics

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@core/common/metrics';

@Injectable()
export class ProductService {
  private productCreatedCounter: any;
  private productPriceGauge: any;

  constructor(private readonly metrics: MetricsService) {
    // Create counter
    this.productCreatedCounter = metrics.createCounter({
      name: 'products_created_total',
      help: 'Total number of products created',
      labelNames: ['category'],
    });

    // Create gauge
    this.productPriceGauge = metrics.createGauge({
      name: 'product_price',
      help: 'Product price',
      labelNames: ['product_id'],
    });
  }

  async createProduct(data: CreateProductDto) {
    // Increment counter
    this.productCreatedCounter.inc({ category: data.category });

    // Set gauge
    this.productPriceGauge.set(data.price, { product_id: data.id });
  }
}
```

#### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nestjs-app'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
```

---

## 🔄 Kết Hợp Tất Cả Các Thành Phần

### Example: Complete Service

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/common/logger';
import { AppConfigService } from '@core/common/config';
import { MetricsService } from '@core/common/metrics';
import { RetryService, CircuitBreakerService } from '@core/infrastructure/resilience';
import { MessageBusService } from '@core/infrastructure/messaging';
import { HttpClientService } from '@core/infrastructure/http';
import { TracingService, SpanKind, SpanStatusCode } from '@core/infrastructure/tracing';
import { ProductCreatedEvent } from '../domain/events';

@Injectable()
export class ProductService {
  private productCreatedCounter: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: AppConfigService,
    private readonly metrics: MetricsService,
    private readonly retry: RetryService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly messageBus: MessageBusService,
    private readonly httpClient: HttpClientService,
    private readonly tracing: TracingService,
  ) {
    // Set logger context
    this.logger.setContext({ service: 'ProductService' });

    // Create metrics
    this.productCreatedCounter = metrics.createCounter({
      name: 'products_created_total',
      help: 'Total products created',
    });
  }

  async createProduct(data: CreateProductDto) {
    // Start span
    const span = this.tracing.startSpan('create-product', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'product.name': data.name,
        'product.category': data.category,
      },
    });

    try {
      this.logger.log('Creating product', 'ProductService.createProduct', {
        productName: data.name,
      });

      // Call external service với retry và circuit breaker
      const externalData = await this.httpClient.get(
        `${this.config.externalServices?.product?.baseUrl}/validate`,
        {
          retry: { maxAttempts: 3 },
          circuitBreaker: { name: 'product-api' },
        },
      );

      // Create product
      const product = new Product(data);
      await this.repository.save(product);

      // Publish domain event
      await this.messageBus.publish(
        new ProductCreatedEvent(product.id, product.name),
        {
          exchange: 'domain-events',
          routingKey: 'product.created',
        },
      );

      // Increment metric
      this.productCreatedCounter.inc();

      // Set span status
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      this.logger.log('Product created successfully', 'ProductService.createProduct', {
        productId: product.id,
      });

      return product;
    } catch (error) {
      // Log error
      this.logger.error(
        'Failed to create product',
        error.stack,
        'ProductService.createProduct',
        { productName: data.name },
      );

      // Set span status
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.end();

      throw error;
    }
  }
}
```

---

## 📊 Monitoring Dashboard

### Grafana Queries

```promql
# Request rate
rate(nestjs_http_requests_total[5m])

# Error rate
rate(nestjs_http_requests_total{status_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(nestjs_http_request_duration_seconds_bucket[5m]))

# Active requests
nestjs_http_active_requests
```

---

## 🎯 Best Practices

### 1. Logging
- ✅ Luôn set context (service, method)
- ✅ Log errors với stack trace
- ✅ Không log sensitive data
- ✅ Sử dụng appropriate log levels

### 2. Configuration
- ✅ Validate config on startup
- ✅ Sử dụng type-safe config
- ✅ Environment-specific configs

### 3. Retry
- ✅ Chỉ retry idempotent operations
- ✅ Set reasonable maxAttempts
- ✅ Exponential backoff cho network calls

### 4. Circuit Breaker
- ✅ Đặt timeout hợp lý
- ✅ Monitor circuit breaker stats
- ✅ Có fallback mechanism

### 5. Message Queue
- ✅ Use persistent messages
- ✅ Handle message failures
- ✅ Idempotent handlers

### 6. Tracing
- ✅ Set meaningful span names
- ✅ Add relevant attributes
- ✅ Propagate trace context

### 7. Metrics
- ✅ Use appropriate metric types
- ✅ Add meaningful labels
- ✅ Don't create too many metrics

---

## 🧪 Testing

### Test với In-Memory Message Bus

```typescript
// Use in-memory bus for testing
process.env.MESSAGE_BUS_TYPE = 'in-memory';
```

### Test với Mock Metrics

```typescript
const mockMetrics = {
  createCounter: jest.fn(),
  createGauge: jest.fn(),
  getMetrics: jest.fn().mockResolvedValue(''),
};
```

### Test với Mock Tracing

```typescript
const mockTracing = {
  startSpan: jest.fn().mockReturnValue({
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  }),
};
```

---

## 📝 Environment Variables Summary

```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://...
DATABASE_READ_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Message Queue
MESSAGE_BUS_TYPE=rabbitmq
RABBITMQ_URL=amqp://...
RABBITMQ_EXCHANGE=domain-events

# OpenTelemetry
OTEL_SERVICE_NAME=nestjs-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_TRACES_EXPORTER=otlp

# Prometheus
METRICS_ENABLED=true
METRICS_PREFIX=nestjs_
```

---

**Last Updated:** 2025-01-17  
**Status:** Complete Implementation Guide ✅
