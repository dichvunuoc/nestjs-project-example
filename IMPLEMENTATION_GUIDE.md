# Hướng Dẫn Triển Khai Các Thành Phần Production-Ready

## 📋 Tổng Quan

Document này hướng dẫn cách tích hợp và sử dụng các thành phần Production-ready đã được implement vào dự án NestJS.

---

## ✅ Các Thành Phần Đã Implement

### 1. Structured Logging với Pino ✅
### 2. Configuration Management với Validation ✅
### 3. Metrics với Prometheus ✅
### 4. Circuit Breaker Pattern ✅
### 5. Generic Retry Policies ✅
### 6. Request Correlation ID Middleware ✅

---

## 🚀 Hướng Dẫn Tích Hợp

### Bước 1: Cài Đặt Dependencies

```bash
npm install pino pino-pretty joi prom-client uuid
npm install -D @types/pino @types/uuid
```

Hoặc nếu dùng bun:
```bash
bun add pino pino-pretty joi prom-client uuid
bun add -d @types/pino @types/uuid
```

### Bước 2: Cập Nhật AppModule

Cập nhật `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CoreModule } from '../libs/core';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from '../libs/core/common/health';
import { ProductModule } from './modules/product/product.module';

// Import các module mới
import { LoggerModule } from '../libs/core/common/logger';
import { ConfigModule } from '../libs/core/common/config';
import { MetricsModule } from '../libs/core/common/metrics';

@Global()
@Module({
  imports: [
    // Configuration Module phải được import đầu tiên
    ConfigModule,
    
    // Logger Module
    LoggerModule,
    
    // Metrics Module
    MetricsModule,
    
    // Core Module (DDD/CQRS)
    CoreModule,
    
    // Database Module
    DatabaseModule,
    
    // Health Module
    HealthModule,
    
    // Feature Modules
    ProductModule,
  ],
})
export class AppModule {}
```

### Bước 3: Cập Nhật main.ts

Cập nhật `src/main.ts` để sử dụng các interceptors và middleware:

```typescript
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@core/common';
import { ResponseInterceptor } from '@core/common';
import { LoggingInterceptor } from '@core/common/logger';
import { MetricsInterceptor } from '@core/common/metrics';
import { CorrelationIdMiddleware } from '@core/common/middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Apply Correlation ID Middleware
  app.use(CorrelationIdMiddleware);

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // Logging interceptor
    new MetricsInterceptor(),  // Metrics interceptor
    new ResponseInterceptor(),  // Response interceptor
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
```

### Bước 4: Tạo File .env

Tạo file `.env` với các biến môi trường cần thiết:

```env
# Application
APP_NAME=nestjs-project-example
APP_VERSION=0.0.1
PORT=3000
NODE_ENV=development
GLOBAL_PREFIX=api

# Database - Write
DB_WRITE_HOST=localhost
DB_WRITE_PORT=5432
DB_WRITE_DATABASE=myapp
DB_WRITE_USERNAME=postgres
DB_WRITE_PASSWORD=postgres
DB_WRITE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Logging
LOG_LEVEL=info

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Tracing (optional)
TRACING_ENABLED=false
TRACING_SERVICE_NAME=nestjs-project-example
TRACING_EXPORTER=console

# Event Bus
EVENT_BUS_TYPE=in-memory

# Resilience
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_MULTIPLIER=2
```

---

## 📖 Hướng Dẫn Sử Dụng

### 1. Structured Logging

#### Sử dụng Logger trong Service:

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService, LOGGER_TOKEN } from '@core/common/logger';
import { Inject } from '@nestjs/common';

@Injectable()
export class MyService {
  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  async doSomething() {
    // Log với context
    const childLogger = this.logger.createChild({ userId: '123' });
    childLogger.info('Processing user request');

    // Log error
    try {
      // ...
    } catch (error) {
      this.logger.error(error, 'Failed to process request');
    }
  }
}
```

#### Logging Interceptor tự động log tất cả HTTP requests/responses.

### 2. Configuration Management

#### Sử dụng ConfigService:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@core/common/config';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  getDatabaseConfig() {
    return this.config.getDatabaseConfig();
  }

  isProduction() {
    return this.config.isProduction();
  }
}
```

### 3. Metrics

#### Metrics tự động được collect bởi MetricsInterceptor.

#### Thêm custom metrics:

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService, METRICS_TOKEN } from '@core/common/metrics';
import { Inject } from '@nestjs/common';

@Injectable()
export class MyService {
  constructor(
    @Inject(METRICS_TOKEN) private readonly metrics: MetricsService,
  ) {}

  async processOrder() {
    // Increment counter
    this.metrics.incrementCounter('orders_processed', {
      status: 'success',
    });

    // Set gauge
    this.metrics.setGauge('active_orders', 42);

    // Measure duration
    const timer = this.metrics.startTimer('order_processing_duration');
    // ... do work
    timer();
  }
}
```

#### Truy cập metrics endpoint:
```
GET http://localhost:3000/metrics
```

### 4. Circuit Breaker

#### Sử dụng Circuit Breaker:

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerFactory } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly circuitBreakerFactory: CircuitBreakerFactory,
  ) {}

  async callExternalApi() {
    const circuitBreaker = this.circuitBreakerFactory.getOrCreate(
      'external-api',
      {
        failureThreshold: 5,
        timeout: 60000,
        resetTimeout: 30000,
      },
    );

    return circuitBreaker.execute(async () => {
      // Call external API
      return await this.httpClient.get('https://api.example.com');
    });
  }
}
```

#### Sử dụng với Decorator:

```typescript
import { CircuitBreaker } from '@core/infrastructure/resilience';

@Injectable()
export class MyService {
  @CircuitBreaker({ failureThreshold: 5, timeout: 60000 })
  async callExternalService() {
    // ...
  }
}
```

### 5. Retry Policies

#### Sử dụng Retry Service:

```typescript
import { Injectable } from '@nestjs/common';
import { RetryService, RetryStrategy } from '@core/infrastructure/resilience';

@Injectable()
export class MyService {
  constructor(private readonly retryService: RetryService) {}

  async callUnreliableService() {
    return this.retryService.execute(
      async () => {
        // Call service that might fail
        return await this.httpClient.get('https://unreliable-api.com');
      },
      {
        maxAttempts: 3,
        strategy: RetryStrategy.EXPONENTIAL,
        initialDelay: 1000,
        maxDelay: 30000,
        shouldRetry: (error) => {
          // Only retry on network errors
          return error.message.includes('ECONNREFUSED');
        },
      },
    );
  }
}
```

#### Sử dụng với Decorator:

```typescript
import { Retry, RetryStrategy } from '@core/infrastructure/resilience';

@Injectable()
export class MyService {
  @Retry({ maxAttempts: 3, strategy: RetryStrategy.EXPONENTIAL })
  async callExternalService() {
    // ...
  }
}
```

### 6. Correlation ID

#### Sử dụng Correlation ID trong Controller:

```typescript
import { Controller, Get } from '@nestjs/common';
import { CorrelationId } from '@core/common';

@Controller('users')
export class UsersController {
  @Get()
  async getUsers(@CorrelationId() correlationId: string) {
    // correlationId được tự động extract từ request headers
    // Sử dụng cho logging, tracing, etc.
    return { correlationId, users: [] };
  }
}
```

Correlation ID tự động được:
- Extract từ `x-correlation-id` hoặc `x-request-id` header
- Generate nếu không có trong request
- Thêm vào response headers
- Available trong request object

---

## 🔍 Kiểm Tra Hoạt Động

### 1. Kiểm tra Logging

Start application và gửi request:
```bash
curl http://localhost:3000/health
```

Kiểm tra logs - sẽ thấy structured JSON logs với correlation ID.

### 2. Kiểm tra Metrics

```bash
curl http://localhost:3000/metrics
```

Sẽ thấy Prometheus metrics format.

### 3. Kiểm tra Configuration Validation

Thử start app với invalid config:
```bash
# Thiếu DB_WRITE_HOST
NODE_ENV=production npm run start
```

App sẽ fail với validation error.

---

## 📝 Notes

1. **Configuration Validation**: App sẽ fail fast nếu config invalid
2. **Logging**: Tự động structured JSON trong production, pretty trong development
3. **Metrics**: Tự động collect HTTP metrics, có thể thêm custom metrics
4. **Circuit Breaker**: Bảo vệ khỏi cascade failures
5. **Retry**: Tự động retry với exponential backoff
6. **Correlation ID**: Tự động track requests qua services

---

## 🎯 Next Steps

Các thành phần còn lại cần implement:

1. **Distributed Tracing với OpenTelemetry** - Cho microservices
2. **Event Bus Abstraction cho RabbitMQ/Kafka** - Cho async communication
3. **Upgrade Health Checks với @nestjs/terminus** - Standardized health checks

Xem `PRODUCTION_READINESS_ANALYSIS.md` để biết chi tiết.
