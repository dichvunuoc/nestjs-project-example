# Hướng Dẫn Triển Khai Các Thành Phần Production-Ready

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách sử dụng các thành phần Production-ready đã được implement trong Core Library.

---

## 🔧 1. CÀI ĐẶT DEPENDENCIES

### Cài đặt các packages cần thiết:

```bash
npm install pino pino-pretty joi uuid
npm install -D @types/uuid
```

### Hoặc với bun:

```bash
bun add pino pino-pretty joi uuid
bun add -d @types/uuid
```

---

## 📝 2. STRUCTURED LOGGING

### 2.1. Setup Logger Module

Trong `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/common/logger';
import { CoreModule } from '@core/core.module';

@Module({
  imports: [
    CoreModule,
    LoggerModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV === 'development',
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 2.2. Sử dụng Logger trong Services

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/common/logger';

@Injectable()
export class ProductService {
  constructor(private readonly logger: LoggerService) {
    // Set context for this service
    this.logger.setContext({ service: 'ProductService' });
  }

  async createProduct(data: any) {
    this.logger.info('Creating product', { productName: data.name });
    
    try {
      // ... business logic
      this.logger.info('Product created successfully', { productId: '123' });
    } catch (error) {
      this.logger.error('Failed to create product', error, { productName: data.name });
      throw error;
    }
  }
}
```

### 2.3. Setup Logging Interceptor

Trong `main.ts`:

```typescript
import { LoggingInterceptor } from '@core/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(LoggerService)));
  
  await app.listen(3000);
}
```

---

## 🔗 3. CORRELATION ID

### 3.1. Setup Correlation ID Interceptor

Trong `main.ts`:

```typescript
import { CorrelationIdInterceptor } from '@core/common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add correlation ID interceptor (should be first)
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  
  await app.listen(3000);
}
```

### 3.2. Sử dụng Correlation ID trong Controllers

```typescript
import { Controller, Get } from '@nestjs/common';
import { CorrelationId } from '@core/common/decorators';

@Controller('products')
export class ProductController {
  @Get()
  async getProducts(@CorrelationId() correlationId: string) {
    // Use correlationId for logging or tracing
    console.log(`Request ID: ${correlationId}`);
    // ...
  }
}
```

### 3.3. Correlation ID trong Services

Correlation ID tự động được thêm vào request headers và có thể được extract từ request context.

---

## ⚙️ 4. CONFIGURATION MANAGEMENT

### 4.1. Setup Config Module

Trong `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@core/common/config';
import { CoreModule } from '@core/core.module';

@Module({
  imports: [
    ConfigModule, // Global module - validates env vars at startup
    CoreModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 4.2. Sử dụng Config Service

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@core/common/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly config: ConfigService) {}

  async connect() {
    const dbUrl = this.config.databaseUrl;
    const isProduction = this.config.isProduction;
    
    // Use typed configuration
    console.log(`Connecting to database: ${dbUrl}`);
  }
}
```

### 4.3. Environment Variables

Tạo file `.env`:

```env
NODE_ENV=development
PORT=3000
APP_NAME=my-service

DATABASE_URL=postgresql://user:password@localhost:5432/dbname

REDIS_HOST=localhost
REDIS_PORT=6379

LOG_LEVEL=info
LOG_PRETTY_PRINT=true

ENABLE_TRACING=false
ENABLE_METRICS=true
```

Config sẽ được validate khi application khởi động. Nếu thiếu hoặc sai format, application sẽ không start.

---

## 🛡️ 5. CIRCUIT BREAKER

### 5.1. Sử dụng Circuit Breaker Service

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async callExternalApi() {
    return this.circuitBreaker.execute(async () => {
      // Call external API
      const response = await fetch('https://api.example.com/data');
      if (!response.ok) {
        throw new Error('API call failed');
      }
      return response.json();
    });
  }
}
```

### 5.2. Circuit Breaker với Custom Options

```typescript
import { Injectable } from '@nestjs/common';
import { 
  CircuitBreakerService,
  CircuitBreakerOptions 
} from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  private readonly circuitBreaker: CircuitBreakerService;

  constructor() {
    const options: CircuitBreakerOptions = {
      errorThresholdPercentage: 50,
      timeout: 60000,
      resetTimeout: 30000,
      volumeThreshold: 5,
    };
    this.circuitBreaker = new CircuitBreakerService(options);
  }

  async callExternalApi() {
    return this.circuitBreaker.execute(async () => {
      // ...
    });
  }

  getStats() {
    return this.circuitBreaker.getStats();
  }
}
```

### 5.3. Circuit Breaker Decorator (Future)

```typescript
import { CircuitBreaker } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  @CircuitBreaker({ errorThresholdPercentage: 50 })
  async callExternalApi() {
    // ...
  }
}
```

---

## 🔄 6. RETRY POLICIES

### 6.1. Sử dụng Retry Service

```typescript
import { Injectable } from '@nestjs/common';
import { RetryService, RetryPolicyType } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(private readonly retryService: RetryService) {}

  async callExternalApi() {
    return this.retryService.execute(
      async () => {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
          throw new Error('API call failed');
        }
        return response.json();
      },
      {
        maxAttempts: 5,
        initialDelay: 1000,
        policy: RetryPolicyType.EXPONENTIAL,
        multiplier: 2,
        shouldRetry: (error) => {
          // Only retry on network errors, not 4xx errors
          return error.message.includes('network') || error.message.includes('timeout');
        },
        onRetry: (error, attempt) => {
          console.log(`Retry attempt ${attempt}: ${error.message}`);
        },
      },
    );
  }
}
```

### 6.2. Retry với Different Policies

```typescript
// Exponential backoff (default)
await retryService.execute(fn, {
  policy: RetryPolicyType.EXPONENTIAL,
  maxAttempts: 5,
  initialDelay: 1000,
});

// Fixed delay
await retryService.execute(fn, {
  policy: RetryPolicyType.FIXED,
  maxAttempts: 3,
  initialDelay: 2000,
});

// Linear backoff
await retryService.execute(fn, {
  policy: RetryPolicyType.LINEAR,
  maxAttempts: 5,
  initialDelay: 1000,
  multiplier: 1.5,
});
```

---

## 🏥 7. HEALTH CHECKS (Upgrade với Terminus)

### 7.1. Cài đặt Terminus

```bash
npm install @nestjs/terminus
```

### 7.2. Upgrade Health Module

Health checks hiện tại đã có sẵn trong `libs/core/common/health/`. Để upgrade với Terminus, cần:

1. Update `health.module.ts` để sử dụng Terminus
2. Update `health.controller.ts` để có `/health`, `/ready`, `/live` endpoints
3. Integrate với existing health indicators

---

## 📊 8. TỔNG HỢP SETUP

### 8.1. Complete `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@core/common/config';
import { LoggerModule } from '@core/common/logger';
import { CoreModule } from '@core/core.module';

@Module({
  imports: [
    // Configuration với validation
    ConfigModule,
    
    // Structured logging
    LoggerModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV === 'development',
    }),
    
    // Core DDD/CQRS
    CoreModule,
    
    // ... feature modules
  ],
})
export class AppModule {}
```

### 8.2. Complete `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { 
  GlobalExceptionFilter,
  ResponseInterceptor,
  CorrelationIdInterceptor,
} from '@core/common';
import { LoggingInterceptor, LoggerService } from '@core/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  // Correlation ID (should be first)
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  
  // Structured logging
  const logger = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  
  // Exception handling
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Response standardization
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

---

## 🎯 9. BEST PRACTICES

### 9.1. Logging
- ✅ Luôn set context cho logger trong constructor
- ✅ Sử dụng appropriate log levels (trace, debug, info, warn, error)
- ✅ Include correlation ID trong logs
- ✅ Sanitize sensitive data trước khi log

### 9.2. Configuration
- ✅ Validate tất cả environment variables
- ✅ Sử dụng typed config service
- ✅ Document required environment variables

### 9.3. Circuit Breaker
- ✅ Sử dụng cho external service calls
- ✅ Monitor circuit breaker stats
- ✅ Set appropriate thresholds

### 9.4. Retry
- ✅ Chỉ retry transient failures
- ✅ Sử dụng exponential backoff cho external APIs
- ✅ Set reasonable max attempts
- ✅ Log retry attempts

---

## 📚 10. NEXT STEPS

Các thành phần còn cần implement:

1. **OpenTelemetry Tracing** - Distributed tracing
2. **Prometheus Metrics** - Metrics collection
3. **Event Bus Abstraction** - RabbitMQ/Kafka integration
4. **HTTP Client Abstraction** - Service-to-service communication
5. **Health Checks với Terminus** - Upgrade existing health checks

Xem `PRODUCTION_READY_ANALYSIS.md` để biết chi tiết.

---

**Last Updated:** 2025-01-17
