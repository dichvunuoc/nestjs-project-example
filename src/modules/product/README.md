# 📦 Product Module

## 📋 Tổng quan

Module quản lý sản phẩm, triển khai theo kiến trúc **DDD + CQRS**.

## 🏗️ Kiến trúc Module

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          HTTP Request                                   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ProductController                            │   │
│  │                  (Infrastructure/HTTP)                          │   │
│  └──────────────────────┬────────────────────┬─────────────────────┘   │
│                         │                    │                          │
│            ┌────────────▼────────┐ ┌────────▼─────────┐                │
│            │    Command Bus      │ │    Query Bus     │                │
│            └────────────┬────────┘ └────────┬─────────┘                │
│                         │                    │                          │
│  ┌──────────────────────▼────────────────────▼─────────────────────┐   │
│  │                   APPLICATION LAYER                              │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐             │   │
│  │  │  Command Handlers   │    │   Query Handlers    │             │   │
│  │  │  • CreateProduct    │    │  • GetProduct       │             │   │
│  │  │  • UpdateProduct    │    │  • GetProductList   │             │   │
│  │  │  • DeleteProduct    │    │                     │             │   │
│  │  │  • IncreaseStock    │    │                     │             │   │
│  │  │  • DecreaseStock    │    │                     │             │   │
│  │  │  • BulkStockAdj     │    │                     │             │   │
│  │  └──────────┬──────────┘    └──────────┬──────────┘             │   │
│  └─────────────┼─────────────────────────┼──────────────────────────┘  │
│                │                          │                             │
│  ┌─────────────▼──────────────────────────▼─────────────────────────┐  │
│  │                    DOMAIN LAYER                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Product (Aggregate Root)                 │ │  │
│  │  │  • create()        • increaseStock()    • rename()          │ │  │
│  │  │  • reconstitute()  • decreaseStock()    • changePrice()     │ │  │
│  │  │  • delete()        • updateInfo()                           │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────┐  ┌────────────────────────────────────┐  │  │
│  │  │   Value Objects   │  │         Domain Services            │  │  │
│  │  │  • ProductId      │  │  • ProductUniquenessService        │  │  │
│  │  │  • Price          │  │  • BulkStockAdjustmentService      │  │  │
│  │  └───────────────────┘  └────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Domain Events                            │ │  │
│  │  │  • ProductCreatedEvent    • ProductDeletedEvent             │ │  │
│  │  │  • ProductUpdatedEvent    • BulkStockAdjustedEvent          │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                │                          │                             │
│  ┌─────────────▼──────────────────────────▼─────────────────────────┐  │
│  │                 INFRASTRUCTURE LAYER                              │  │
│  │  ┌─────────────────────┐    ┌─────────────────────┐              │  │
│  │  │  ProductRepository  │    │   ProductReadDao    │              │  │
│  │  │    (Write Side)     │    │    (Read Side)      │              │  │
│  │  └──────────┬──────────┘    └──────────┬──────────┘              │  │
│  │             │                          │                          │  │
│  │  ┌──────────▼──────────────────────────▼──────────────────────┐  │  │
│  │  │                    Drizzle ORM                              │  │  │
│  │  │              (products table schema)                        │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📁 Cấu trúc thư mục

```
src/modules/product/
├── domain/                          # Domain Layer (Pure TypeScript)
│   ├── entities/
│   │   └── product.entity.ts        # Aggregate Root
│   │
│   ├── value-objects/
│   │   ├── product-id.value-object.ts
│   │   └── price.value-object.ts
│   │
│   ├── events/
│   │   ├── product-created.event.ts
│   │   ├── product-updated.event.ts
│   │   ├── product-deleted.event.ts
│   │   └── bulk-stock-adjusted.event.ts
│   │
│   ├── services/
│   │   ├── product-uniqueness.service.ts    # Domain Service
│   │   └── bulk-stock-adjustment.service.ts # Domain Service
│   │
│   └── repositories/
│       └── product.repository.interface.ts  # Port (Interface)
│
├── application/                     # Application Layer
│   ├── commands/
│   │   ├── create-product.command.ts
│   │   ├── update-product.command.ts
│   │   ├── delete-product.command.ts
│   │   ├── increase-stock.command.ts
│   │   ├── decrease-stock.command.ts
│   │   ├── bulk-stock-adjustment.command.ts
│   │   └── handlers/
│   │       ├── create-product.handler.ts
│   │       ├── update-product.handler.ts
│   │       └── ...
│   │
│   ├── queries/
│   │   ├── get-product.query.ts
│   │   ├── get-product-list.query.ts
│   │   ├── handlers/
│   │   │   ├── get-product.handler.ts
│   │   │   └── get-product-list.handler.ts
│   │   └── ports/
│   │       └── product-read-dao.interface.ts  # Port (Interface)
│   │
│   └── dtos/
│       ├── product.dto.ts           # Read Model DTO
│       ├── create-product.dto.ts
│       └── update-product.dto.ts
│
├── infrastructure/                  # Infrastructure Layer
│   ├── http/
│   │   └── product.controller.ts    # HTTP Adapter
│   │
│   └── persistence/
│       ├── drizzle/
│       │   └── schema/
│       │       └── product.schema.ts
│       │
│       ├── write/
│       │   └── product.repository.ts    # Adapter for IProductRepository
│       │
│       ├── read/
│       │   └── product-read-dao.ts      # Adapter for IProductReadDao
│       │
│       └── product-uniqueness-checker.ts  # Adapter for IProductUniquenessChecker
│
└── product.module.ts                # NestJS Module
```

## 🔄 Luồng dữ liệu (Data Flow)

### Write Flow (Command Side)

```
HTTP POST /products
        │
        ▼
┌───────────────────┐
│ ProductController │
│   create(dto)     │
└────────┬──────────┘
         │ new CreateProductCommand(...)
         ▼
┌────────────────────┐
│    Command Bus     │
│    execute()       │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               CreateProductHandler                          │
│  1. Validate uniqueness (Domain Service)                    │
│     └─► ProductUniquenessService.ensureNameIsUnique()       │
│           └─► IProductUniquenessChecker.isUnique() [Port]   │
│                 └─► ProductUniquenessChecker [Adapter]      │
│                       └─► Drizzle ORM Query                 │
│                                                             │
│  2. Create Domain Entity                                    │
│     └─► Product.create(productId, props)                    │
│           └─► Validation in Entity                          │
│           └─► ProductCreatedEvent added                     │
│                                                             │
│  3. Persist via Repository                                  │
│     └─► IProductRepository.save(product) [Port]             │
│           └─► ProductRepository [Adapter]                   │
│                 └─► Drizzle ORM Insert                      │
│                 └─► Events → Outbox Table (same tx)         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│            Outbox Processor (Background)                    │
│  1. Poll outbox table                                       │
│  2. Publish ProductCreatedEvent to Event Bus                │
│  3. Projections/Subscribers handle event                    │
└─────────────────────────────────────────────────────────────┘
```

### Read Flow (Query Side)

```
HTTP GET /products/:id
        │
        ▼
┌───────────────────┐
│ ProductController │
│   getById(id)     │
└────────┬──────────┘
         │ new GetProductQuery(id)
         ▼
┌────────────────────┐
│     Query Bus      │
│     execute()      │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  GetProductHandler                          │
│  1. Query via Read DAO                                      │
│     └─► IProductReadDao.findById(id) [Port]                 │
│           └─► ProductReadDao [Adapter]                      │
│                 └─► Drizzle ORM Select                      │
│                 └─► Return ProductDto (flat DTO)            │
│                                                             │
│  2. Return DTO directly (no Domain Entity)                  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────────┐
│   ProductDto      │
│   (JSON Response) │
└───────────────────┘
```

## 🎯 Nguyên tắc DDD trong Module này

### 1. Aggregate Root (Product)

```typescript
// Product là Aggregate Root - entry point duy nhất
const product = Product.create(productId, props);

// Mọi modification phải qua Aggregate Root
product.increaseStock(10); // ✅ Đúng
product.rename('New Name'); // ✅ Đúng

// KHÔNG modify trực tiếp props
product._props.stock = 10; // ❌ Sai - Bypass Aggregate
```

### 2. Factory Methods

```typescript
// Tạo mới: Qua factory method, emit event
const product = Product.create(productId, props);
// → ProductCreatedEvent được add

// Reconstitute từ DB: Không emit event
const product = Product.reconstitute(id, props, version, createdAt, updatedAt);
// → Không có event
```

### 3. Domain Events

```typescript
// Events chỉ được emit từ Aggregate Root
product.increaseStock(10);
// → ProductUpdatedEvent với { stock: newStock }

// Events được tự động publish sau save
await repository.save(product);
// → Outbox Pattern: Events lưu vào DB cùng transaction
// → Outbox Processor publish sau đó
```

### 4. Value Objects

```typescript
// Value Objects là immutable và self-validating
const price = new Price(99.99, 'USD');

// So sánh theo value
const price1 = new Price(99.99, 'USD');
const price2 = new Price(99.99, 'USD');
price1.equals(price2); // true

// Operations trả về instance mới
const newPrice = price.multiply(1.1); // Price(109.99, 'USD')
```

### 5. Domain Services

```typescript
// Domain Service cho logic không thuộc một Aggregate
const uniquenessService = new ProductUniquenessService(checker);
await uniquenessService.ensureNameIsUnique(name);

// BulkStockAdjustmentService cho logic phức tạp
const bulkService = new BulkStockAdjustmentService();
const result = bulkService.processBulkAdjustment(
  adjustments,
  products,
  options,
);
```

## 🔧 API Endpoints

### Commands (Write)

| Method | Endpoint                       | Description           |
| ------ | ------------------------------ | --------------------- |
| POST   | `/products`                    | Create product        |
| PUT    | `/products/:id`                | Update product        |
| DELETE | `/products/:id`                | Delete product (soft) |
| POST   | `/products/:id/stock/increase` | Increase stock        |
| POST   | `/products/:id/stock/decrease` | Decrease stock        |
| POST   | `/products/stock/bulk-adjust`  | Bulk stock adjustment |

### Queries (Read)

| Method | Endpoint        | Description               |
| ------ | --------------- | ------------------------- |
| GET    | `/products/:id` | Get product by ID         |
| GET    | `/products`     | List products (paginated) |

### Example Requests

```bash
# Create Product
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15",
    "description": "Latest iPhone",
    "priceAmount": 999.99,
    "priceCurrency": "USD",
    "stock": 100,
    "category": "Electronics"
  }'

# Bulk Stock Adjustment
curl -X POST http://localhost:3000/products/stock/bulk-adjust \
  -H "Content-Type: application/json" \
  -d '{
    "adjustments": [
      { "productId": "uuid-1", "quantity": 10, "reason": "Restock" },
      { "productId": "uuid-2", "quantity": -5, "reason": "Damaged" }
    ],
    "options": {
      "maxStockLimit": 1000,
      "allowPartialSuccess": true
    }
  }'
```

## 🧪 Testing Strategy

### Unit Tests (Domain Layer)

```typescript
// product.entity.spec.ts
describe('Product Entity', () => {
  it('should create product and emit event', () => {
    const product = Product.create(productId, validProps);

    expect(product.id).toBe(productId.value);
    expect(product.getDomainEvents()).toHaveLength(1);
    expect(product.getDomainEvents()[0].eventType).toBe('ProductCreated');
  });

  it('should throw DomainException for invalid stock', () => {
    expect(() => product.decreaseStock(9999)).toThrow(DomainException);
  });
});
```

### Integration Tests (Repository)

```typescript
describe('ProductRepository', () => {
  it('should save and retrieve product', async () => {
    const product = Product.create(productId, validProps);

    await repository.save(product);
    const retrieved = await repository.getById(product.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe(product.name);
  });
});
```

## 🔗 Dependencies

- `@core` - Base abstractions
- `@shared` - Infrastructure implementations
- `src/database` - Database configuration

## 📚 Related Documentation

- [Domain Layer Guide](./domain/README.md)
- [Application Layer Guide](./application/README.md)
- [Infrastructure Layer Guide](./infrastructure/README.md)
