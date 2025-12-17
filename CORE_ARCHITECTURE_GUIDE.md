# Hướng Dẫn Sử Dụng Core Architecture cho NestJS Projects

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách sử dụng Core Architecture từ project này cho các NestJS projects khác. Core Architecture cung cấp một bộ foundation components theo chuẩn DDD/CQRS có thể tái sử dụng.

## 🎯 Mục Đích

Core Architecture (`libs/core/`) được thiết kế để:

- ✅ Tái sử dụng across multiple projects
- ✅ Cung cấp foundation cho DDD/CQRS pattern
- ✅ Standardize error handling và HTTP responses
- ✅ Giảm boilerplate code
- ✅ Đảm bảo consistency giữa các projects

## 📦 Cấu Trúc Core Library

```
libs/core/
├── domain/                      # Domain Layer (Pure TypeScript)
│   ├── entities/               # BaseEntity, AggregateRoot
│   ├── value-objects/          # BaseValueObject
│   ├── events/                 # IDomainEvent
│   └── services/               # BaseService
│
├── application/                # Application Layer (Pure TypeScript)
│   ├── commands/               # ICommand, ICommandBus, ICommandHandler
│   ├── queries/                # IQuery, IQueryBus, IQueryHandler
│   └── projections/            # IProjection
│
├── infrastructure/             # Infrastructure Layer
│   ├── buses/                  # NestCommandBus, NestQueryBus
│   ├── events/                 # EventBus
│   ├── persistence/            # BaseRepository, AggregateRepository, ReadDAO
│   └── caching/                # CacheService, CacheInterceptor
│
└── common/                     # Common Utilities
    ├── exceptions/             # BaseException, DomainException, ...
    ├── filters/                # GlobalExceptionFilter
    ├── interceptors/           # ResponseInterceptor
    ├── http/                   # Response DTOs
    ├── pagination/             # Pagination DTOs & utilities
    └── health/                 # Health checks
```

## 🚀 Cách Sử Dụng

### Bước 1: Copy Core Library

Copy thư mục `libs/core/` từ project này sang project mới của bạn.

```bash
# Từ project template
cp -r libs/core/ /path/to/new-project/libs/core/
```

### Bước 2: Cấu Hình TypeScript Paths

Thêm path aliases vào `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["libs/core/*"]
    }
  }
}
```

### Bước 3: Cài Đặt Dependencies

Đảm bảo các dependencies sau được cài đặt:

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/cqrs": "^11.0.3",
    "@nestjs/platform-fastify": "^11.0.1",
    "drizzle-orm": "^0.36.0",
    "pg": "^8.13.1",
    "redis": "^5.10.0"
  }
}
```

### Bước 4: Import CoreModule

Trong `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';

@Module({
  imports: [
    CoreModule, // Global module - provides CQRS buses
    // ... other modules
  ],
})
export class AppModule {}
```

### Bước 5: Setup Global Filters & Interceptors

Trong `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, ResponseInterceptor } from '@core/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

## 📚 Sử Dụng Các Components

### 1. Domain Layer

#### Tạo Aggregate Root

```typescript
import { AggregateRoot } from '@core/domain';
import { IDomainEvent } from '@core/domain';

export class Product extends AggregateRoot {
  constructor(
    public readonly id: string,
    public name: string,
    public price: number,
  ) {
    super();
  }

  updateName(newName: string): void {
    if (!newName || newName.length === 0) {
      throw new DomainException('Product name cannot be empty', 'INVALID_NAME');
    }
    this.name = newName;
    this.addDomainEvent(new ProductUpdatedEvent(this.id));
  }
}
```

#### Tạo Value Object

```typescript
import { BaseValueObject } from '@core/domain';

export class Price extends BaseValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD',
  ) {
    super();
    if (amount < 0) {
      throw new DomainException('Price cannot be negative', 'INVALID_PRICE');
    }
    if (currency.length !== 3) {
      throw new DomainException(
        'Currency must be 3 characters',
        'INVALID_CURRENCY',
      );
    }
  }
}
```

#### Tạo Domain Event

```typescript
import { IDomainEvent } from '@core/domain';

export class ProductCreatedEvent implements IDomainEvent {
  constructor(public readonly productId: string) {}
}
```

### 2. Application Layer

#### Tạo Command

```typescript
import { ICommand } from '@core/application';

export class CreateProductCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly price: number,
  ) {}
}
```

#### Tạo Command Handler

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICommandBus } from '@core/application';
import { CreateProductCommand } from './create-product.command';
import { IProductRepository } from '../../domain/repositories';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<
  CreateProductCommand,
  string
> {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(command: CreateProductCommand): Promise<string> {
    const product = new Product(generateId(), command.name, command.price);

    await this.productRepository.save(product);
    return product.id;
  }
}
```

#### Tạo Query

```typescript
import { IQuery } from '@core/application';

export class GetProductQuery implements IQuery<ProductDto> {
  constructor(public readonly productId: string) {}
}
```

#### Tạo Query Handler

```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { IQuery } from '@core/application';
import { GetProductQuery } from './get-product.query';
import { IProductReadDao } from './ports';
import { NotFoundException } from '@core/common';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<
  GetProductQuery,
  ProductDto
> {
  constructor(private readonly productReadDao: IProductReadDao) {}

  async execute(query: GetProductQuery): Promise<ProductDto> {
    const product = await this.productReadDao.findById(query.productId);

    if (!product) {
      throw NotFoundException.entity('Product', query.productId);
    }

    return product;
  }
}
```

### 3. Infrastructure Layer

#### Tạo Repository Implementation

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { AggregateRepository } from '@core/infrastructure';
import { Product } from '../../domain/entities';
import { IProductRepository } from '../../domain/repositories';
import { DATABASE_WRITE } from '@core/infrastructure';

@Injectable()
export class ProductRepository
  extends AggregateRepository<Product>
  implements IProductRepository
{
  constructor(@Inject(DATABASE_WRITE) db: any) {
    super(db, 'products');
  }

  // Implement custom repository methods if needed
  async findByName(name: string): Promise<Product | null> {
    // Implementation
  }
}
```

#### Tạo Read DAO

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { BaseReadDao } from '@core/infrastructure';
import { IProductReadDao } from '../../application/queries/ports';
import { ProductDto } from '../../application/dtos';
import { DATABASE_READ } from '@core/infrastructure';

@Injectable()
export class ProductReadDao extends BaseReadDao implements IProductReadDao {
  constructor(@Inject(DATABASE_READ) db: any) {
    super(db);
  }

  async findById(id: string): Promise<ProductDto | null> {
    // Implementation using Drizzle ORM
  }
}
```

### 4. HTTP Controllers

#### Sử Dụng Command/Query Buses

```typescript
import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from '@core';
import { ICommandBus, IQueryBus } from '@core/application';
import { CreateProductCommand } from '../application/commands';
import { GetProductQuery } from '../application/queries';

@Controller('products')
export class ProductController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    const command = new CreateProductCommand(dto.name, dto.price);
    const productId = await this.commandBus.execute(command);
    return SuccessResponseDto.created({ id: productId });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const query = new GetProductQuery(id);
    return this.queryBus.execute(query);
  }
}
```

### 5. Exception Handling

#### Sử Dụng Custom Exceptions

```typescript
import {
  NotFoundException,
  DomainException,
  ValidationException,
  ConflictException,
} from '@core/common';

// In domain entity
if (!product) {
  throw NotFoundException.entity('Product', productId);
}

// In domain service
if (stock < 0) {
  throw DomainException.withCode(
    'INSUFFICIENT_STOCK',
    'Stock cannot be negative',
  );
}

// In application handler
if (existingProduct) {
  throw ConflictException.duplicate('Product', 'name', name);
}
```

Global Exception Filter sẽ tự động xử lý và trả về response chuẩn:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2025-01-17T10:00:00.000Z",
  "path": "/products/123",
  "method": "GET",
  "error": {
    "name": "NotFoundException",
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with id '123' not found",
    "details": {
      "resourceType": "Product",
      "resourceId": "123"
    }
  }
}
```

### 6. Pagination

#### Sử Dụng Pagination DTOs

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationDto, PaginatedResponseDto } from '@core/common';
import { GetProductListQuery } from '../application/queries';

@Controller('products')
export class ProductController {
  @Get()
  async getList(@Query() pagination: PaginationDto) {
    // Validate pagination
    const validation = pagination.validate();
    if (!validation.isValid) {
      throw new ValidationException(validation.errors);
    }

    const query = new GetProductListQuery(pagination);
    const result = await this.queryBus.execute(query);

    return PaginatedResponseDto.create(result.data, result.total, pagination);
  }
}
```

### 7. Response Formatting

Response Interceptor tự động wrap responses:

**Success Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2025-01-17T10:00:00.000Z",
  "path": "/products/123",
  "method": "GET",
  "data": {
    "id": "123",
    "name": "Product Name",
    "price": 99.99
  }
}
```

**Paginated Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2025-01-17T10:00:00.000Z",
  "data": [
    { "id": "1", "name": "Product 1" },
    { "id": "2", "name": "Product 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## 🏗️ Module Structure Template

Khi tạo module mới, follow structure này:

```
src/modules/{module-name}/
├── domain/
│   ├── entities/               # Aggregate Roots
│   ├── value-objects/          # Value Objects
│   ├── events/                 # Domain Events
│   ├── repositories/           # Repository Interfaces
│   └── services/               # Domain Services
│
├── application/
│   ├── commands/
│   │   ├── handlers/
│   │   └── index.ts
│   ├── queries/
│   │   ├── handlers/
│   │   ├── ports/              # Read DAO Interfaces
│   │   └── index.ts
│   └── dtos/
│
├── infrastructure/
│   ├── http/                   # Controllers
│   └── persistence/
│       ├── drizzle/schema/     # Drizzle schemas
│       ├── write/              # Repository implementations
│       └── read/               # Read DAO implementations
│
└── {module-name}.module.ts
```

## 📝 Best Practices

### 1. Dependency Rules

- ✅ **Domain Layer**: Chỉ import từ `@core/domain` và `@core/common`
- ✅ **Application Layer**: Chỉ import từ `domain` và `@core/application`
- ✅ **Infrastructure Layer**: Có thể import từ tất cả layers và frameworks

### 2. Exception Handling

- ✅ Sử dụng domain exceptions cho business errors
- ✅ Sử dụng validation exceptions cho input errors
- ✅ Sử dụng NotFoundException cho missing resources
- ✅ Global Exception Filter sẽ tự động handle

### 3. CQRS Pattern

- ✅ Commands: Mutate state, return simple result hoặc void
- ✅ Queries: Read data, return DTOs
- ✅ Separate read/write models
- ✅ Use projections cho complex read models

### 4. Response Formatting

- ✅ Response Interceptor tự động wrap responses
- ✅ Sử dụng SuccessResponseDto cho explicit responses
- ✅ Sử dụng PaginatedResponseDto cho paginated lists

## 🔧 Customization

### Override Global Exception Filter

Nếu cần customize exception handling:

```typescript
import { Catch, ExceptionFilter } from '@nestjs/common';
import { GlobalExceptionFilter } from '@core/common';

@Catch(CustomException)
export class CustomExceptionFilter extends GlobalExceptionFilter {
  // Override methods as needed
}
```

### Custom Response Interceptor

Nếu cần customize response format:

```typescript
import { Injectable, NestInterceptor } from '@nestjs/common';
import { ResponseInterceptor } from '@core/common';

@Injectable()
export class CustomResponseInterceptor extends ResponseInterceptor {
  // Override intercept method
}
```

## 📚 Examples

Xem module `product` trong project này như một reference implementation hoàn chỉnh.

## 🚀 Migration Checklist

Khi migrate core library sang project mới:

- [ ] Copy `libs/core/` directory
- [ ] Update `tsconfig.json` với path aliases
- [ ] Install required dependencies
- [ ] Import `CoreModule` trong `app.module.ts`
- [ ] Setup Global Exception Filter trong `main.ts`
- [ ] Setup Response Interceptor trong `main.ts`
- [ ] Update existing modules để sử dụng core components
- [ ] Test exception handling
- [ ] Test response formatting
- [ ] Update documentation

## 📞 Support

Nếu có questions hoặc issues:

1. Review `ARCHITECTURE_ANALYSIS.md` để hiểu kiến trúc
2. Xem examples trong `src/modules/product/`
3. Check `MISSING_COMPONENTS.md` cho planned features

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0
