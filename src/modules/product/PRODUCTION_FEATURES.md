# Product Module - Production Features Integration

## 📋 Tổng Quan

Product Module đã được tích hợp đầy đủ các thành phần Production-ready:

✅ **Structured Logging** với Correlation ID  
✅ **Metrics Collection** (Prometheus)  
✅ **Distributed Tracing** (OpenTelemetry)  
✅ **Message Queue** (Event Bus)  
✅ **HTTP Client** với Retry/Circuit Breaker  
✅ **Configuration Management**  

---

## 🔧 Các Thành Phần Đã Tích Hợp

### 1. Structured Logging

#### Controller Level
```typescript
@Controller('products')
export class ProductController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext({ service: 'ProductController' });
  }

  @Post()
  async create(
    @Body() dto: CreateProductDto,
    @CorrelationId() correlationId: string,
  ) {
    this.logger.log('Creating product', 'ProductController.create', {
      productName: dto.name,
      correlationId,
    });
    // ...
  }
}
```

#### Handler Level
```typescript
@CommandHandler(CreateProductCommand)
export class CreateProductHandler {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext({ service: 'CreateProductHandler' });
  }

  async execute(command: CreateProductCommand) {
    this.logger.log('Creating product', 'CreateProductHandler.execute', {
      productName: command.name,
    });
    // ...
  }
}
```

### 2. Metrics Collection

#### Controller Metrics
```typescript
private requestCounter = metrics.createCounter({
  name: 'product_requests_total',
  help: 'Total number of product API requests',
  labelNames: ['method', 'endpoint'],
});

// Usage
this.requestCounter.inc({ method: 'POST', endpoint: '/products' });
```

#### Handler Metrics
```typescript
private productCreatedCounter = metrics.createCounter({
  name: 'products_created_total',
  help: 'Total number of products created',
  labelNames: ['category'],
});

// Usage
this.productCreatedCounter.inc({ category: command.category });
```

### 3. Distributed Tracing

#### Handler Tracing
```typescript
async execute(command: CreateProductCommand) {
  const span = this.tracing.startSpan('create-product', {
    kind: SpanKind.INTERNAL,
    attributes: {
      'product.name': command.name,
      'product.category': command.category,
    },
  });

  try {
    // Business logic
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  } finally {
    span.end();
  }
}
```

### 4. Message Queue Integration

#### Publish Events
```typescript
await this.messageBus.publish(
  new ProductCreatedEvent(product.id, {
    name: product.name,
    // ...
  }),
  {
    exchange: 'domain-events',
    routingKey: 'product.created',
    persistent: true,
  },
);
```

### 5. HTTP Client (Future Use)

```typescript
// Example: Call external service
const result = await this.httpClient.get(
  'https://api.example.com/validate',
  {
    retry: { maxAttempts: 3 },
    circuitBreaker: { name: 'external-api' },
  },
);
```

---

## 📊 Metrics Collected

### Controller Metrics
- `product_requests_total` - Total API requests by method and endpoint

### Handler Metrics
- `products_created_total` - Total products created by category

### Auto Metrics (from MetricsInterceptor)
- `nestjs_http_requests_total` - All HTTP requests
- `nestjs_http_request_duration_seconds` - Request duration
- `nestjs_http_active_requests` - Active requests

---

## 🔍 Logging Examples

### Success Log
```
[INFO] [ProductController] Creating product {"productName":"Laptop","correlationId":"abc-123"}
[INFO] [CreateProductHandler] Creating product {"productName":"Laptop"}
[INFO] [CreateProductHandler] Product created successfully {"productId":"prod-123"}
```

### Error Log
```
[ERROR] [CreateProductHandler] Failed to create product {"stack":"...","productName":"Laptop"}
```

---

## 🧪 Testing

### Unit Tests
```typescript
describe('CreateProductHandler', () => {
  it('should create product with logging and metrics', async () => {
    // Test implementation
    expect(mockLogger.log).toHaveBeenCalled();
    expect(mockMetrics.createCounter).toHaveBeenCalled();
    expect(mockTracing.startSpan).toHaveBeenCalled();
    expect(mockMessageBus.publish).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('ProductModule Integration', () => {
  it('should include correlation ID in headers', async () => {
    const response = await request(app)
      .get('/products')
      .set('X-Correlation-ID', 'test-id')
      .expect(200);

    expect(response.headers['x-correlation-id']).toBe('test-id');
  });
});
```

---

## 🚀 Usage

### 1. Create Product với Full Observability

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: my-correlation-id" \
  -d '{
    "name": "Laptop",
    "description": "Gaming Laptop",
    "priceAmount": 999.99,
    "stock": 10,
    "category": "Electronics"
  }'
```

**What happens:**
1. ✅ Correlation ID được inject và propagate
2. ✅ Request được log với correlation ID
3. ✅ Span được tạo cho tracing
4. ✅ Metrics counter được increment
5. ✅ Event được publish to message queue
6. ✅ Response được log

### 2. Get Product

```bash
curl http://localhost:3000/products/{id} \
  -H "X-Correlation-ID: my-correlation-id"
```

**What happens:**
1. ✅ Correlation ID được track
2. ✅ Request được log
3. ✅ Span được tạo
4. ✅ Metrics được collected

---

## 📈 Monitoring

### Prometheus Queries

```promql
# Product creation rate
rate(products_created_total[5m])

# Product creation by category
sum by (category) (products_created_total)

# API request rate
rate(product_requests_total[5m])

# Error rate
rate(product_requests_total{status_code=~"5.."}[5m])
```

### Grafana Dashboard

Import metrics vào Grafana để visualize:
- Product creation trends
- API request patterns
- Error rates
- Performance metrics

---

## 🔄 Event Flow

```
1. HTTP Request → Controller
   ↓
2. Controller logs request với correlation ID
   ↓
3. Command/Query → Handler
   ↓
4. Handler starts span (tracing)
   ↓
5. Handler logs operation
   ↓
6. Business logic execution
   ↓
7. Domain event emitted
   ↓
8. Event published to message queue
   ↓
9. Metrics incremented
   ↓
10. Span ended với status
   ↓
11. Response logged
   ↓
12. HTTP Response với correlation ID header
```

---

## ✅ Checklist

- [x] LoggerService integrated
- [x] Correlation ID tracking
- [x] Metrics collection
- [x] Distributed tracing
- [x] Message queue integration
- [x] Error logging
- [x] Unit tests
- [x] Integration tests

---

**Last Updated:** 2025-01-17
