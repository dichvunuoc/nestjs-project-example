# Product Module - DDD/CQRS Example

Module demo đầy đủ các thành phần theo chuẩn DDD/CQRS.

## Cấu trúc Module

```
product/
├── domain/                          # Domain Layer (Pure TypeScript)
│   ├── entities/
│   │   └── product.entity.ts        # Product Aggregate Root
│   ├── value-objects/
│   │   ├── price.value-object.ts    # Price Value Object
│   │   └── product-id.value-object.ts
│   ├── events/
│   │   ├── product-created.event.ts  # Domain Events
│   │   ├── product-updated.event.ts
│   │   └── product-deleted.event.ts
│   └── repositories/
│       └── product.repository.interface.ts  # Repository Interface (Port)
│
├── application/                     # Application Layer (Use Cases)
│   ├── commands/
│   │   ├── create-product.command.ts
│   │   ├── update-product.command.ts
│   │   ├── delete-product.command.ts
│   │   ├── increase-stock.command.ts
│   │   ├── decrease-stock.command.ts
│   │   └── handlers/                # Command Handlers
│   ├── queries/
│   │   ├── get-product.query.ts
│   │   ├── get-product-list.query.ts
│   │   └── handlers/               # Query Handlers
│   └── dtos/
│       ├── product.dto.ts           # Data Transfer Objects
│       ├── create-product.dto.ts
│       └── update-product.dto.ts
│
└── infrastructure/                  # Infrastructure Layer (Adapters)
    ├── persistence/
    │   ├── drizzle/
    │   │   └── schema/
    │   │       └── product.schema.ts  # Drizzle Schema
    │   ├── write/
    │   │   └── product.repository.ts  # Repository Implementation (Adapter)
    │   └── read/
    │       └── product-read-dao.ts    # Read DAO (Optimized for queries)
    └── http/
        └── product.controller.ts     # HTTP Controller
```

## Các Thành Phần Chính

### 1. Domain Layer (Pure Business Logic)

#### Aggregate Root
- **Product**: Aggregate Root quản lý toàn bộ business logic
  - Factory methods: `create()`, `reconstitute()`
  - Business methods: `update()`, `increaseStock()`, `decreaseStock()`, `delete()`
  - Tự động emit domain events khi có thay đổi

#### Value Objects
- **Price**: Đại diện cho giá tiền với currency
- **ProductId**: Đảm bảo ID luôn hợp lệ

#### Domain Events
- **ProductCreatedEvent**: Khi tạo product mới
- **ProductUpdatedEvent**: Khi cập nhật product
- **ProductDeletedEvent**: Khi xóa product

#### Repository Interface
- **IProductRepository**: Interface (Port) định nghĩa contract
- Infrastructure layer implement interface này (Adapter)

### 2. Application Layer (Use Cases)

#### Commands (Write Operations)
- `CreateProductCommand`: Tạo product mới
- `UpdateProductCommand`: Cập nhật product
- `DeleteProductCommand`: Xóa product
- `IncreaseStockCommand`: Tăng stock
- `DecreaseStockCommand`: Giảm stock

#### Queries (Read Operations)
- `GetProductQuery`: Lấy product theo ID
- `GetProductListQuery`: Lấy danh sách products với pagination và filters

#### Handlers
- Command Handlers: Xử lý commands, sử dụng Aggregate Root
- Query Handlers: Xử lý queries, sử dụng Read DAO

### 3. Infrastructure Layer (Technical Implementation)

#### Persistence
- **Drizzle Schema**: Định nghĩa database schema
- **ProductRepository**: Implement IProductRepository, extend BaseAggregateRepository
  - Tự động publish domain events khi save aggregate
  - Optimistic Concurrency Control với version
- **ProductReadDao**: Optimized cho read operations

#### HTTP
- **ProductController**: REST API endpoints
  - POST `/products` - Create product
  - GET `/products/:id` - Get product by ID
  - GET `/products` - Get product list
  - PUT `/products/:id` - Update product
  - DELETE `/products/:id` - Delete product
  - POST `/products/:id/stock/increase` - Increase stock
  - POST `/products/:id/stock/decrease` - Decrease stock

## Dependency Rules

### Domain Layer
- ✅ **ĐƯỢC**: `@core/domain`, `@core/common`
- ❌ **CẤM**: `application`, `infrastructure`, `@nestjs/*`, `drizzle-orm`

### Application Layer
- ✅ **ĐƯỢC**: `domain`, `@core/application`
- ❌ **CẤM**: `infrastructure` (trừ Interface), `drizzle-orm`, `express`

### Infrastructure Layer
- ✅ **ĐƯỢC**: `domain`, `application`, `@core/*`, `@nestjs/*`, `drizzle-orm`

## Flow Example

### Create Product Flow

1. **HTTP Request** → `ProductController.create()`
2. **Controller** → Tạo `CreateProductCommand` → Gửi qua `CommandBus`
3. **CommandBus** → Route đến `CreateProductHandler`
4. **Handler** → Sử dụng `IProductRepository` (interface)
5. **Repository** → Load/create `Product` aggregate
6. **Aggregate** → Business logic + emit `ProductCreatedEvent`
7. **Repository** → Save aggregate + publish domain events
8. **EventBus** → Publish events (có thể trigger projections)

### Get Product Flow

1. **HTTP Request** → `ProductController.getById()`
2. **Controller** → Tạo `GetProductQuery` → Gửi qua `QueryBus`
3. **QueryBus** → Route đến `GetProductHandler`
4. **Handler** → Sử dụng `IProductReadDao` (optimized read)
5. **Read DAO** → Query database → Return `ProductDto`

## Database Migration

```bash
# Generate migration từ schema
bun run db:generate

# Run migration
bun run db:migrate
```

## API Examples

### Create Product
```bash
POST /products
Content-Type: application/json

{
  "name": "Laptop",
  "description": "High performance laptop",
  "priceAmount": 999.99,
  "priceCurrency": "USD",
  "stock": 10,
  "category": "Electronics"
}
```

### Get Product
```bash
GET /products/{id}
```

### Get Product List
```bash
GET /products?page=1&limit=10&category=Electronics&search=laptop
```

### Update Product
```bash
PUT /products/{id}
Content-Type: application/json

{
  "name": "Updated Laptop",
  "priceAmount": 899.99
}
```

### Increase Stock
```bash
POST /products/{id}/stock/increase
Content-Type: application/json

{
  "quantity": 5
}
```

## Notes

- **Optimistic Concurrency Control**: Sử dụng version để tránh lost updates
- **Domain Events**: Tự động publish khi aggregate được save
- **CQRS Separation**: Write side (Aggregate) và Read side (Read DAO) tách biệt
- **Dependency Inversion**: Application layer chỉ phụ thuộc vào interfaces (Ports), không phụ thuộc vào implementations (Adapters)




