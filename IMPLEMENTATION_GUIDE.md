# Hướng Dẫn Sử Dụng Các Thành Phần Production-Ready

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách sử dụng các thành phần đã được triển khai để đưa hệ thống lên Production-ready.

## 🎯 Các Thành Phần Đã Triển Khai

### 1. ✅ Structured Logging với Correlation IDs

**Location:** `libs/core/common/logger/`

**Features:**
- Structured logging với JSON format trong production
- Correlation IDs để trace requests qua multiple services
- Request/Response logging interceptor
- Child loggers với context

**Setup:**

```typescript
// main.ts
import { LoggerModule } from '@core/common/logger';
import { CorrelationIdInterceptor, LoggingInterceptor } from '@core/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add correlation ID interceptor
  app.useGlobalInterceptors(new CorrelationIdInterceptor(logger));
  
  // Add logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  
  await app.listen(3000);
}
```

**Usage:**

```typescript
import { StructuredLoggerService } from '@core/common/logger';

@Injectable()
export class ProductService {
  constructor(private readonly logger: StructuredLoggerService) {}

  async createProduct(data: CreateProductDto) {
    this.logger.info('Creating product', {
      productName: data.name,
      userId: data.userId,
    });

    try {
      const product = await this.repository.save(product);
      this.logger.info('Product created', { productId: product.id });
      return product;
    } catch (error) {
      this.logger.error('Failed to create product', error, {
        productName: data.name,
      });
      throw error;
    }
  }
}
```

---

### 2. ✅ Configuration Management với Validation

**Location:** `libs/core/common/config/`

**Features:**
- Type-safe configuration
- Validation tại startup
- Environment-specific configs
- Schema-based validation

**Setup:**

```typescript
// app.module.ts
import { ConfigModule } from '@core/common/config';

@Module({
  imports: [
    ConfigModule, // Global module
    // ... other modules
  ],
})
export class AppModule {}
```

**Usage:**

```typescript
import { TypedConfigService } from '@core/common/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly config: TypedConfigService) {}

  async connect() {
    const dbConfig = this.config.getDatabaseConfig();
    
    // Type-safe access
    const host = dbConfig.DATABASE_HOST;
    const port = dbConfig.DATABASE_PORT;
    
    // Environment check
    if (this.config.isProduction()) {
      // Production-specific logic
    }
  }
}
```

**Environment Variables:**

```bash
# .env
NODE_ENV=production
PORT=3000
APP_NAME=my-service

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=mydb

REDIS_HOST=localhost
REDIS_PORT=6379
```

---

### 3. ✅ Circuit Breaker

**Location:** `libs/core/infrastructure/resilience/circuit-breaker/`

**Features:**
- Protect against cascading failures
- Automatic recovery
- Configurable thresholds
- Statistics tracking

**Setup:**

```typescript
// app.module.ts
import { ResilienceModule } from '@core/infrastructure/resilience';

@Module({
  imports: [
    ResilienceModule, // Global module
    // ... other modules
  ],
})
export class AppModule {}
```

**Usage:**

```typescript
import { CircuitBreakerService } from '@core/infrastructure/resilience';
import { CircuitBreaker } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  // Manual usage
  async callExternalApi() {
    return this.circuitBreaker.execute(async () => {
      return this.httpClient.get('/external-api/data');
    });
  }

  // Decorator usage (requires interceptor implementation)
  @CircuitBreaker({ failureThreshold: 5, timeout: 5000 })
  async callExternalApiWithDecorator() {
    return this.httpClient.get('/external-api/data');
  }
}
```

**Check Circuit State:**

```typescript
const stats = this.circuitBreaker.getStats();
console.log('Circuit state:', stats.state);
console.log('Failures:', stats.failures);
console.log('Successes:', stats.successes);
```

---

### 4. ✅ Retry Policies

**Location:** `libs/core/infrastructure/resilience/retry/`

**Features:**
- Multiple retry strategies (fixed, exponential, linear)
- Configurable retry attempts
- Exponential backoff với jitter
- Custom retryable error checks

**Usage:**

```typescript
import { RetryService, RetryStrategy } from '@core/infrastructure/resilience';
import { Retry } from '@core/infrastructure/resilience';

@Injectable()
export class DatabaseService {
  constructor(private readonly retryService: RetryService) {}

  // Manual usage
  async saveData(data: any) {
    const result = await this.retryService.execute(
      async () => {
        return this.repository.save(data);
      },
      {
        maxRetries: 3,
        strategy: RetryStrategy.EXPONENTIAL,
        initialDelay: 1000,
        jitter: true,
        isRetryable: (error) => {
          // Only retry on transient errors
          return error.message.includes('ECONNREFUSED') ||
                 error.message.includes('ETIMEDOUT');
        },
      },
    );

    return result.result;
  }

  // Decorator usage (requires interceptor implementation)
  @Retry({ maxRetries: 3, strategy: RetryStrategy.EXPONENTIAL })
  async saveDataWithDecorator(data: any) {
    return this.repository.save(data);
  }
}
```

---

### 5. ✅ External Event Bus Abstraction

**Location:** `libs/core/infrastructure/messaging/external-event-bus/`

**Features:**
- Abstraction cho RabbitMQ/Kafka
- Event serialization/deserialization
- Publish/Subscribe pattern
- Connection management

**Setup:**

```typescript
// app.module.ts
import { RabbitMQEventBus } from '@core/infrastructure/messaging';

@Module({
  providers: [
    {
      provide: 'EXTERNAL_EVENT_BUS',
      useClass: RabbitMQEventBus, // or KafkaEventBus
    },
  ],
})
export class AppModule {}
```

**Usage:**

```typescript
import { IExternalEventBus } from '@core/infrastructure/messaging';

@Injectable()
export class ProductService {
  constructor(
    @Inject('EXTERNAL_EVENT_BUS')
    private readonly externalEventBus: IExternalEventBus,
  ) {}

  async createProduct(data: CreateProductDto) {
    const product = await this.repository.save(product);

    // Publish domain event đến external message broker
    await this.externalEventBus.publish(
      new ProductCreatedEvent(product.id),
      'product.created', // routing key
    );

    return product;
  }
}

// Subscribe to events
@Injectable()
export class ProductEventHandler {
  constructor(
    @Inject('EXTERNAL_EVENT_BUS')
    private readonly externalEventBus: IExternalEventBus,
  ) {}

  async onModuleInit() {
    await this.externalEventBus.subscribe(
      'ProductCreatedEvent',
      async (event) => {
        // Handle event
        await this.handleProductCreated(event);
      },
      {
        queueName: 'product-events',
        exchangeName: 'domain-events',
        durable: true,
      },
    );
  }
}
```

---

### 6. ✅ HTTP Client Abstraction

**Location:** `libs/core/infrastructure/http/http-client/`

**Features:**
- Built-in retry và circuit breaker
- Request/Response logging
- Type-safe requests
- Timeout handling

**Setup:**

```typescript
// app.module.ts
import { HttpClientModule } from '@core/infrastructure/http/http-client';

@Module({
  imports: [
    HttpClientModule, // Global module
    // ... other modules
  ],
})
export class AppModule {}
```

**Usage:**

```typescript
import { HttpClientService } from '@core/infrastructure/http/http-client';

@Injectable()
export class ExternalApiService {
  constructor(private readonly httpClient: HttpClientService) {}

  async getData() {
    const response = await this.httpClient.get('/api/data', {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      circuitBreaker: true,
      headers: {
        'Authorization': 'Bearer token',
      },
    });

    return response.data;
  }

  async postData(data: any) {
    const response = await this.httpClient.post('/api/data', data, {
      timeout: 10000,
      retries: 2,
    });

    return response.data;
  }
}
```

---

## 🔧 Integration vào Existing Code

### Step 1: Update CoreModule

```typescript
// libs/core/core.module.ts
import { LoggerModule } from './common/logger';
import { ConfigModule } from './common/config';
import { ResilienceModule } from './infrastructure/resilience';
import { HttpClientModule } from './infrastructure/http/http-client';

@Global()
@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    ResilienceModule,
    HttpClientModule,
    // ... existing imports
  ],
  // ... rest of module
})
export class CoreModule {}
```

### Step 2: Update main.ts

```typescript
// src/main.ts
import { CorrelationIdInterceptor, LoggingInterceptor, StructuredLoggerService } from '@core/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const logger = app.get(StructuredLoggerService);
  
  // Add interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(logger),
    new LoggingInterceptor(logger),
  );
  
  await app.listen(3000);
}
```

### Step 3: Update Exception Filter để sử dụng Structured Logger

```typescript
// libs/core/common/filters/global-exception.filter.ts
import { StructuredLoggerService } from '../logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // ... existing code
    
    // Log với structured format
    this.logger.error('Exception occurred', exception, {
      path: request.url,
      method: request.method,
      correlationId: (request as any).correlationId,
    });
    
    // ... rest of handler
  }
}
```

---

## 📊 Monitoring & Observability

### Logs

Structured logs sẽ được output dưới dạng JSON trong production:

```json
{
  "level": "info",
  "message": "Request completed",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000",
  "requestId": "req-1234567890-abc123",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "duration": "45ms",
  "timestamp": "2025-01-17T10:00:00.000Z"
}
```

### Circuit Breaker Stats

```typescript
const stats = circuitBreaker.getStats();
// Monitor: stats.state, stats.failures, stats.successes
```

---

## 🚀 Next Steps

### Cần Triển Khai Tiếp:

1. **OpenTelemetry Tracing**
   - Auto-instrumentation cho HTTP requests
   - Database query tracing
   - Export đến Jaeger/Zipkin

2. **Metrics (Prometheus)**
   - HTTP metrics (request duration, status codes)
   - Business metrics (domain events)
   - Infrastructure metrics (database pool, cache hit rate)

3. **Health Checks với Terminus**
   - Migrate từ custom implementation
   - Add liveness/readiness probes
   - Graceful shutdown

4. **Complete External Event Bus**
   - Implement RabbitMQ với amqplib
   - Implement Kafka với kafkajs
   - Add event store support

5. **Complete HTTP Client**
   - Implement với axios
   - Add request/response interceptors
   - Add timeout handling

---

## 📝 Notes

- Tất cả các thành phần đều có interfaces để dễ dàng swap implementations
- Các thành phần được thiết kế để work independently
- Có thể enable/disable từng feature tùy theo nhu cầu
- Tất cả đều có logging để debug

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0
