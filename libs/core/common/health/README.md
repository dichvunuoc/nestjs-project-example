# Health Check Module

Module kiểm tra sức khỏe của ứng dụng và các dependencies (database, redis, etc.)

## 📋 Tổng Quan

Health Check Module cung cấp các endpoints để:
- Kiểm tra trạng thái tổng thể của ứng dụng
- Kiểm tra kết nối với các dependencies (database, redis)
- Hỗ trợ liveness và readiness probes cho Kubernetes/Docker

## 🚀 Sử Dụng

### Import Module

Module đã được import trong `AppModule`:

```typescript
import { HealthModule } from '../libs/core/common/health';

@Module({
  imports: [
    HealthModule,
    // ...
  ],
})
export class AppModule {}
```

### Endpoints

#### 1. Overall Health Check
```
GET /health
```

Trả về trạng thái chi tiết của tất cả health indicators:

```json
{
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy",
      "responseTime": "5ms",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "redis": {
      "status": "up",
      "message": "Redis cache is healthy",
      "responseTime": "2ms",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Liveness Probe
```
GET /health/live
```

Kiểm tra ứng dụng có đang chạy không (luôn trả về 200 nếu service đang chạy):

```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Readiness Probe
```
GET /health/ready
```

Kiểm tra ứng dụng có sẵn sàng nhận traffic không (kiểm tra dependencies):

```json
{
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": { ... },
    "redis": { ... }
  }
}
```

Trả về 503 nếu service không ready.

## 🔧 Health Indicators

### Database Health Indicator

Tự động kiểm tra kết nối PostgreSQL database:
- Sử dụng `DATABASE_POOL` provider từ `DatabaseModule`
- Thực hiện query `SELECT 1` để kiểm tra kết nối
- Trả về response time

### Redis Health Indicator

Tự động kiểm tra kết nối Redis cache:
- Sử dụng `ICacheService` provider (nếu có)
- Thực hiện set/get test để kiểm tra
- Trả về `degraded` nếu Redis không được cấu hình (không bắt buộc)

## 📝 Tạo Custom Health Indicator

Để tạo health indicator mới:

1. Implement `IHealthIndicator` interface:

```typescript
import { Injectable } from '@nestjs/common';
import type { IHealthIndicator, HealthCheckResult, HealthStatus } from '../health.interface';

@Injectable()
export class CustomHealthIndicator implements IHealthIndicator {
  async check(): Promise<HealthCheckResult> {
    try {
      // Your health check logic here
      return {
        status: HealthStatus.UP,
        message: 'Custom service is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: HealthStatus.DOWN,
        message: 'Custom service is down',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
```

2. Đăng ký trong `HealthModule`:

```typescript
@Module({
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    CustomHealthIndicator, // Add your indicator
  ],
})
export class HealthModule implements OnModuleInit {
  constructor(
    private readonly healthService: HealthService,
    private readonly databaseIndicator: DatabaseHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly customIndicator: CustomHealthIndicator, // Inject
  ) {}

  onModuleInit() {
    this.healthService.registerIndicator('database', this.databaseIndicator);
    this.healthService.registerIndicator('redis', this.redisIndicator);
    this.healthService.registerIndicator('custom', this.customIndicator); // Register
  }
}
```

## 🎯 Health Status

- `up`: Service hoạt động bình thường
- `down`: Service không hoạt động hoặc có lỗi
- `degraded`: Service hoạt động nhưng có vấn đề (ví dụ: Redis không được cấu hình)

## 🔍 Sử Dụng Trong Production

### Kubernetes

Cấu hình liveness và readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Docker Compose

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Load Balancer

Cấu hình health check endpoint:
- Health check URL: `/health/ready`
- Expected status code: `200`
- Check interval: `30s`
- Timeout: `5s`

## 📚 API Reference

### HealthService

- `checkHealth()`: Kiểm tra tất cả indicators
- `checkIndicator(name)`: Kiểm tra một indicator cụ thể
- `registerIndicator(name, indicator)`: Đăng ký indicator mới
- `unregisterIndicator(name)`: Hủy đăng ký indicator

### IHealthIndicator

Interface cần implement cho custom indicators:

```typescript
interface IHealthIndicator {
  check(): Promise<HealthCheckResult>;
}
```

## 🐛 Troubleshooting

### Database health check fails

- Kiểm tra `DATABASE_POOL` provider có được cung cấp trong `DatabaseModule`
- Kiểm tra database connection string và credentials
- Kiểm tra database có đang chạy không

### Redis health check returns degraded

- Đây là bình thường nếu Redis không được cấu hình
- Để sử dụng Redis, cần cấu hình `ICacheService` provider
- Nếu không cần Redis, có thể bỏ qua status `degraded`

### Health check endpoint returns 500

- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo tất cả dependencies đã được cấu hình đúng
- Kiểm tra network connectivity

