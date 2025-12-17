# Hướng Dẫn Sử Dụng Các Thành Phần Production-Ready

## 📋 Tổng Quan

Document này hướng dẫn cách sử dụng các thành phần Production-ready đã được implement:
- Structured Logging với Correlation ID
- Configuration Management với Validation
- Retry Policies
- Circuit Breaker Pattern

---

## 1. Structured Logging với Correlation ID

### Setup

#### Bước 1: Import LoggerModule vào AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { LoggerModule } from '@core/common/logger';

@Module({
  imports: [
    CoreModule,
    LoggerModule, // Add LoggerModule
    // ... other modules
  ],
})
export class AppModule {}
```

#### Bước 2: Setup Global Interceptors trong main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, ResponseInterceptor } from '@core/common';
import { 
  LoggerService, 
  CorrelationIdInterceptor, 
  LoggingInterceptor 
} from '@core/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(LoggerService);

  // Correlation ID Interceptor - MUST be first
  app.useGlobalInterceptors(new CorrelationIdInterceptor(logger));

  // Logging Interceptor - Logs requests/responses
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

### Usage

#### Sử dụng Logger trong Service/Controller

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/common/logger';

@Injectable()
export class ProductService {
  constructor(private readonly logger: LoggerService) {}

  async createProduct(data: CreateProductDto) {
    this.logger.log('Creating product', 'ProductService', { productName: data.name });
    
    try {
      const product = await this.repository.save(data);
      this.logger.log('Product created successfully', 'ProductService', { productId: product.id });
      return product;
    } catch (error) {
      this.logger.error('Failed to create product', error.stack, 'ProductService', { 
        productName: data.name 
      });
      throw error;
    }
  }
}
```

#### Lấy Correlation ID trong Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { CorrelationId } from '@core/common/logger';

@Controller('products')
export class ProductController {
  @Get()
  async getProducts(@CorrelationId() correlationId: string) {
    // correlationId sẽ tự động được inject từ header X-Correlation-ID
    console.log('Request correlation ID:', correlationId);
    // ...
  }
}
```

#### Log Output Format

**Development (Pretty Print):**
```
[2025-01-17T10:00:00.000Z] [INFO] [ProductService] Creating product {"correlationId":"abc-123","productName":"Laptop"}
```

**Production (JSON):**
```json
{
  "timestamp": "2025-01-17T10:00:00.000Z",
  "level": "INFO",
  "message": "Creating product",
  "context": "ProductService",
  "correlationId": "abc-123",
  "productName": "Laptop"
}
```

---

## 2. Configuration Management với Validation

### Setup

#### Bước 1: Import AppConfigModule vào AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@core/common/config';
import { CoreModule } from '@core/core.module';

@Module({
  imports: [
    AppConfigModule, // MUST be imported first (before other modules that need config)
    CoreModule,
    // ... other modules
  ],
})
export class AppModule {}
```

#### Bước 2: Tạo .env file

```env
# .env
NODE_ENV=development
PORT=3000
API_PREFIX=api

DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DATABASE_READ_URL=postgresql://user:password@localhost:5432/mydb-read
DATABASE_MAX_CONNECTIONS=10
DATABASE_CONNECTION_TIMEOUT=5000

REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

LOG_LEVEL=info

# Optional: JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Optional: External Services
EXTERNAL_SERVICE_PAYMENT_URL=https://api.payment.com
EXTERNAL_SERVICE_PAYMENT_TIMEOUT=5000
EXTERNAL_SERVICE_PAYMENT_RETRY_MAX_ATTEMPTS=3
EXTERNAL_SERVICE_PAYMENT_RETRY_DELAY=1000
```

### Usage

#### Inject ConfigService vào Service

```typescript
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@core/common/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly config: AppConfigService) {}

  async connect() {
    const dbUrl = this.config.database.writeUrl;
    const maxConnections = this.config.database.maxConnections;
    
    // Use config values
    console.log(`Connecting to database: ${dbUrl}`);
    console.log(`Max connections: ${maxConnections}`);
  }

  checkEnvironment() {
    if (this.config.isProduction) {
      // Production-specific logic
    }
    
    if (this.config.isDevelopment) {
      // Development-specific logic
    }
  }
}
```

#### Type-safe Config Access

```typescript
// All config properties are type-safe
const port: number = this.config.port; // ✅ Type-safe
const nodeEnv: 'development' | 'staging' | 'production' = this.config.nodeEnv; // ✅ Type-safe
const dbUrl: string = this.config.database.writeUrl; // ✅ Type-safe
```

#### Validation

Config validation runs automatically on application startup. If validation fails, application will not start:

```bash
# Missing required variable
Error: Configuration validation failed:
Missing required environment variable: DATABASE_URL
```

---

## 3. Retry Policies

### Setup

#### Import ResilienceModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ResilienceModule } from '@core/infrastructure/resilience';

@Module({
  imports: [
    ResilienceModule, // Add ResilienceModule
    // ... other modules
  ],
})
export class AppModule {}
```

### Usage

#### Sử dụng RetryService trực tiếp

```typescript
import { Injectable } from '@nestjs/common';
import { RetryService } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(private readonly retryService: RetryService) {}

  async callExternalApi() {
    return this.retryService.execute(
      async () => {
        // Your API call
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }
        return response.json();
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential', // 'fixed' | 'exponential' | 'linear'
        maxDelay: 10000,
        shouldRetry: (error, attempt) => {
          // Only retry on network errors, not 4xx errors
          if (error.message.includes('404')) {
            return false; // Don't retry 404
          }
          return true;
        },
        onRetry: (error, attempt, delay) => {
          console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
        },
      },
    );
  }
}
```

#### Retry với Custom Logic

```typescript
async fetchWithRetry(url: string) {
  return this.retryService.execute(
    () => this.httpService.get(url).toPromise(),
    {
      maxAttempts: 5,
      delay: 500,
      backoff: 'exponential',
      shouldRetry: (error, attempt) => {
        // Retry on timeout or 5xx errors
        return (
          error.message.includes('timeout') ||
          (error.response?.status >= 500 && error.response?.status < 600)
        );
      },
    },
  );
}
```

---

## 4. Circuit Breaker Pattern

### Setup

#### ResilienceModule đã được import (xem phần Retry)

### Usage

#### Sử dụng CircuitBreakerService trực tiếp

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from '@core/infrastructure/resilience';

@Injectable()
export class ExternalApiService {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async callExternalApi() {
    return this.circuitBreaker.execute(
      'external-api', // Circuit breaker name
      async () => {
        // Your API call
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }
        return response.json();
      },
      {
        timeout: 3000, // 3 seconds timeout
        errorThresholdPercentage: 50, // Open circuit if 50% requests fail
        resetTimeout: 30000, // Try to close after 30 seconds
        minimumRequests: 5, // Need at least 5 requests before opening
        onOpen: () => {
          console.log('Circuit breaker opened - service is down');
        },
        onClose: () => {
          console.log('Circuit breaker closed - service recovered');
        },
      },
    );
  }
}
```

#### Kết hợp Retry + Circuit Breaker

```typescript
import { Injectable } from '@nestjs/common';
import { RetryService, CircuitBreakerService } from '@core/infrastructure/resilience';

@Injectable()
export class ResilientApiService {
  constructor(
    private readonly retryService: RetryService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async callApi() {
    // First, circuit breaker checks if service is available
    // Then, retry logic handles transient failures
    return this.circuitBreaker.execute(
      'external-api',
      () =>
        this.retryService.execute(
          async () => {
            const response = await fetch('https://api.example.com/data');
            if (!response.ok) throw new Error('API failed');
            return response.json();
          },
          { maxAttempts: 3, delay: 1000 },
        ),
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
      },
    );
  }
}
```

#### Kiểm tra Circuit Breaker Stats

```typescript
async getCircuitBreakerStatus() {
  const stats = this.circuitBreaker.getStats('external-api');
  
  if (stats) {
    console.log('Circuit State:', stats.state);
    console.log('Total Requests:', stats.totalRequests);
    console.log('Failures:', stats.failures);
    console.log('Successes:', stats.successes);
    console.log('Error Rate:', (stats.failures / stats.totalRequests) * 100);
  }
}

async resetCircuitBreaker() {
  this.circuitBreaker.reset('external-api');
}
```

---

## 5. Kết Hợp Tất Cả Các Thành Phần

### Example: Complete Service với Logging, Config, Retry, và Circuit Breaker

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/common/logger';
import { AppConfigService } from '@core/common/config';
import { RetryService, CircuitBreakerService } from '@core/infrastructure/resilience';

@Injectable()
export class PaymentService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: AppConfigService,
    private readonly retryService: RetryService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    // Set logger context
    this.logger.setContext({ service: 'PaymentService' });
  }

  async processPayment(amount: number, userId: string) {
    this.logger.log('Processing payment', 'PaymentService.processPayment', {
      amount,
      userId,
    });

    try {
      // Get payment API URL from config
      const paymentUrl = this.config.externalServices?.payment?.baseUrl;
      if (!paymentUrl) {
        throw new Error('Payment service URL not configured');
      }

      // Call payment API với circuit breaker và retry
      const result = await this.circuitBreaker.execute(
        'payment-api',
        () =>
          this.retryService.execute(
            async () => {
              const response = await fetch(`${paymentUrl}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, userId }),
              });

              if (!response.ok) {
                throw new Error(`Payment API failed: ${response.statusText}`);
              }

              return response.json();
            },
            {
              maxAttempts: 3,
              delay: 1000,
              backoff: 'exponential',
            },
          ),
        {
          timeout: this.config.externalServices?.payment?.timeout || 5000,
          errorThresholdPercentage: 50,
        },
      );

      this.logger.log('Payment processed successfully', 'PaymentService.processPayment', {
        paymentId: result.id,
        amount,
        userId,
      });

      return result;
    } catch (error) {
      this.logger.error(
        'Payment processing failed',
        error.stack,
        'PaymentService.processPayment',
        { amount, userId },
      );
      throw error;
    }
  }
}
```

---

## 6. Best Practices

### Logging
- ✅ Luôn set context khi log (service name, method name)
- ✅ Log errors với stack trace
- ✅ Không log sensitive data (passwords, tokens) trong production
- ✅ Sử dụng appropriate log levels (error, warn, info, debug)

### Configuration
- ✅ Luôn validate config on startup
- ✅ Sử dụng type-safe config service
- ✅ Không hardcode config values
- ✅ Sử dụng environment-specific configs (.env.development, .env.production)

### Retry
- ✅ Chỉ retry idempotent operations
- ✅ Set reasonable maxAttempts (3-5)
- ✅ Sử dụng exponential backoff cho network calls
- ✅ Không retry 4xx errors (client errors)

### Circuit Breaker
- ✅ Đặt timeout hợp lý (3-5 seconds)
- ✅ Monitor circuit breaker stats
- ✅ Set appropriate error threshold (50-70%)
- ✅ Có fallback mechanism khi circuit is open

---

## 7. Testing

### Test Logger

```typescript
describe('LoggerService', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
  });

  it('should log with context', () => {
    logger.setContext({ userId: '123' });
    logger.log('Test message', 'TestContext');
    // Assert log output
  });
});
```

### Test Retry

```typescript
describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService();
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Failed');
      return 'success';
    };

    const result = await retryService.execute(fn, { maxAttempts: 3 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

### Test Circuit Breaker

```typescript
describe('CircuitBreakerService', () => {
  let circuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    circuitBreaker = new CircuitBreakerService();
  });

  it('should open circuit after threshold', async () => {
    const failingFn = async () => {
      throw new Error('Service down');
    };

    // Make enough failing requests
    for (let i = 0; i < 5; i++) {
      try {
        await circuitBreaker.execute('test', failingFn, {
          minimumRequests: 5,
          errorThresholdPercentage: 50,
        });
      } catch (e) {
        // Expected
      }
    }

    // Circuit should be open
    const stats = circuitBreaker.getStats('test');
    expect(stats?.state).toBe(CircuitBreakerState.OPEN);
  });
});
```

---

**Last Updated:** 2025-01-17  
**Status:** Implementation Complete
