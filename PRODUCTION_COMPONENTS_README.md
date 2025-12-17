# Production-Ready Components - Quick Start

## 🎯 Tổng Quan

Dự án đã được bổ sung các thành phần Production-ready quan trọng:

1. ✅ **Structured Logging** (Pino)
2. ✅ **Configuration Management** (Joi validation)
3. ✅ **Metrics** (Prometheus)
4. ✅ **Circuit Breaker**
5. ✅ **Retry Policies**
6. ✅ **Correlation ID Middleware**

---

## 🚀 Quick Start

### 1. Cài đặt Dependencies

```bash
npm install pino pino-pretty joi prom-client uuid @nestjs/terminus
npm install -D @types/pino @types/uuid
```

### 2. Cập nhật AppModule

```typescript
import { ConfigModule } from '@core/common/config';
import { LoggerModule } from '@core/common/logger';
import { MetricsModule } from '@core/common/metrics';

@Module({
  imports: [
    ConfigModule,    // Phải import đầu tiên
    LoggerModule,
    MetricsModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Cập nhật main.ts

```typescript
import { CorrelationIdMiddleware } from '@core/common/middleware';
import { LoggingInterceptor } from '@core/common/logger';
import { MetricsInterceptor } from '@core/common/metrics';

// Apply middleware
app.use(CorrelationIdMiddleware);

// Apply interceptors
app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new MetricsInterceptor(),
);
```

### 4. Tạo .env file

Xem `IMPLEMENTATION_GUIDE.md` để biết các biến môi trường cần thiết.

---

## 📖 Sử Dụng

### Logging

```typescript
import { LoggerService, LOGGER_TOKEN } from '@core/common/logger';

constructor(@Inject(LOGGER_TOKEN) private logger: LoggerService) {}

this.logger.info('Message');
this.logger.error(error, 'Error message');
```

### Configuration

```typescript
import { ConfigService } from '@core/common/config';

constructor(private config: ConfigService) {}

const dbConfig = this.config.getDatabaseConfig();
```

### Metrics

```typescript
import { MetricsService, METRICS_TOKEN } from '@core/common/metrics';

constructor(@Inject(METRICS_TOKEN) private metrics: MetricsService) {}

this.metrics.incrementCounter('custom_metric', { label: 'value' });
```

### Circuit Breaker

```typescript
import { CircuitBreakerFactory } from '@core/infrastructure/resilience';

const breaker = circuitBreakerFactory.getOrCreate('service-name', {
  failureThreshold: 5,
  timeout: 60000,
});

await breaker.execute(async () => {
  // Call external service
});
```

### Retry

```typescript
import { RetryService, RetryStrategy } from '@core/infrastructure/resilience';

await retryService.execute(
  async () => { /* ... */ },
  { maxAttempts: 3, strategy: RetryStrategy.EXPONENTIAL }
);
```

---

## 📚 Tài Liệu Chi Tiết

- `PRODUCTION_READINESS_ANALYSIS.md` - Phân tích chi tiết các thành phần
- `IMPLEMENTATION_GUIDE.md` - Hướng dẫn tích hợp đầy đủ
- `IMPLEMENTATION_SUMMARY.md` - Tổng kết implementation

---

## ✅ Endpoints

- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check (existing)

---

## 🔍 Kiểm Tra

```bash
# Check logs
curl http://localhost:3000/health

# Check metrics
curl http://localhost:3000/metrics
```
