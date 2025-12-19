# 📦 @core - Shared Kernel (Pure Abstractions)

## 📋 Tổng quan

`@core` là **Shared Kernel** chứa các abstractions (interfaces, abstract classes) nền tảng cho kiến trúc **DDD + CQRS + Hexagonal Architecture**.

> **⚠️ Nguyên tắc quan trọng:** Library này **KHÔNG được phép** import bất kỳ thứ gì từ NestJS, Drizzle, hoặc framework/library cụ thể nào. Chỉ chứa **Pure TypeScript**.

## 🏗️ Triết lý thiết kế

### Hexagonal Architecture (Ports & Adapters)

```
┌──────────────────────────────────────────────────────────────┐
│                      Application Core                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Domain Layer                        │  │
│  │  • Entities (AggregateRoot, BaseEntity)               │  │
│  │  • Value Objects                                       │  │
│  │  • Domain Events                                       │  │
│  │  • Domain Services (Pure Business Logic)              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Application Layer                     │  │
│  │  • Command/Query Interfaces                           │  │
│  │  • Handler Interfaces                                  │  │
│  │  • Projection Interfaces                              │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │  Port   │          │  Port   │          │  Port   │
   │(Interface)│        │(Interface)│        │(Interface)│
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Adapter │          │ Adapter │          │ Adapter │
   │(Drizzle)│          │(NestJS) │          │ (Redis) │
   └─────────┘          └─────────┘          └─────────┘
```

### Dependency Rule

```
Feature Modules → @shared → @core
      ↓              ↓         ↓
 Can import      Can import   NO imports
 from both      from @core   from @shared
```

**@core KHÔNG ĐƯỢC import từ @shared**

## 📁 Cấu trúc thư mục

```
libs/core/
├── domain/                         # Domain Layer
│   ├── entities/                   # Entity abstractions
│   │   ├── interfaces/
│   │   │   ├── entity.interface.ts
│   │   │   ├── aggregate-root.interface.ts
│   │   │   └── soft-deletable.interface.ts
│   │   ├── base.entity.ts          # Base Entity class
│   │   └── aggregate-root.ts       # Aggregate Root base
│   │
│   ├── value-objects/
│   │   └── base.value-object.ts    # Value Object base
│   │
│   ├── events/
│   │   └── domain-event.interface.ts  # Domain Event interface
│   │
│   ├── repositories/
│   │   └── aggregate-repository.interface.ts  # Repository port
│   │
│   └── services/
│       ├── base.service.ts
│       └── interfaces/              # Domain Service ports
│           ├── uniqueness-checker.interface.ts
│           └── stock-adjustment.interface.ts
│
├── application/                    # Application Layer
│   ├── commands/
│   │   └── interfaces/
│   │       ├── command.interface.ts
│   │       ├── command-bus.interface.ts
│   │       └── command-handler.interface.ts
│   │
│   ├── queries/
│   │   └── interfaces/
│   │       ├── query.interface.ts
│   │       ├── query-bus.interface.ts
│   │       └── query-handler.interface.ts
│   │
│   └── projections/
│       ├── interfaces/
│       │   └── projection.interface.ts
│       └── base-projection.ts
│
├── infrastructure/                 # Infrastructure Ports Only
│   ├── persistence/
│   │   ├── unit-of-work/
│   │   │   └── unit-of-work.interface.ts
│   │   └── read/
│   │       └── interfaces/read-dao.interface.ts
│   │
│   ├── events/
│   │   └── interfaces/event-bus.interface.ts
│   │
│   ├── caching/
│   │   └── cache.interface.ts
│   │
│   └── outbox/                     # Transactional Outbox Pattern
│       └── outbox.interface.ts
│
├── common/                         # Cross-cutting Concerns
│   ├── exceptions/                 # Exception hierarchy
│   │   ├── base.exception.ts
│   │   ├── domain.exception.ts
│   │   ├── not-found.exception.ts
│   │   └── ...
│   │
│   └── context/                    # Request Context
│       └── request-context.interface.ts
│
├── constants/                      # DI Tokens
│   └── tokens.ts
│
└── index.ts                        # Public API
```

## 🔧 Cách sử dụng

### Import từ @core

```typescript
// Import tất cả từ @core
import {
  // Domain Layer
  AggregateRoot,
  BaseEntity,
  BaseValueObject,
  IDomainEvent,
  BaseDomainEvent,
  IAggregateRepository,
  DomainException,

  // Application Layer
  ICommand,
  IQuery,
  ICommandHandler,
  IQueryHandler,
  ICommandBus,
  IQueryBus,

  // Infrastructure Ports
  IUnitOfWork,
  IEventBus,
  ICacheService,
  IOutboxRepository,

  // Constants
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
  EVENT_BUS_TOKEN,
} from '@core';
```

### Tạo Aggregate Root

```typescript
import { AggregateRoot, DomainException } from '@core/domain';

export class Product extends AggregateRoot {
  private constructor(
    id: ProductId,
    private _props: ProductProps,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id.value, version, createdAt, updatedAt);
  }

  // Factory Method: Tạo mới
  static create(id: ProductId, props: ProductProps): Product {
    // Validation trong Entity
    this.validateName(props.name);

    const product = new Product(id, props);

    // Emit Domain Event
    product.addDomainEvent(new ProductCreatedEvent(id.value, props));

    return product;
  }

  // Factory Method: Reconstitute từ DB
  static reconstitute(
    id: string,
    props: ProductProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
  ): Product {
    return new Product(new ProductId(id), props, version, createdAt, updatedAt);
  }

  // Business Methods
  rename(newName: string): void {
    Product.validateName(newName);
    this._props.name = newName;
    this.addDomainEvent(new ProductRenamedEvent(this.id, newName));
  }

  // Validation Methods (static để dùng trong factory)
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException('Product name is required');
    }
  }
}
```

### Tạo Value Object

```typescript
import { BaseValueObject, DomainException } from '@core/domain';

export class Price extends BaseValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD',
  ) {
    super();

    // Self-validating
    if (amount < 0) {
      throw new DomainException('Price cannot be negative');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.amount, this.currency];
  }

  // Immutable operations
  add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot add different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }
}
```

### Tạo Domain Event

```typescript
import { BaseDomainEvent, IEventMetadata } from '@core/domain';

interface ProductCreatedData {
  name: string;
  price: number;
  category: string;
}

export class ProductCreatedEvent extends BaseDomainEvent<ProductCreatedData> {
  constructor(
    aggregateId: string,
    data: ProductCreatedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'ProductCreated', data, metadata);
  }
}
```

### Tạo Repository Interface (Port)

```typescript
import { IAggregateRepository } from '@core/domain';
import { Product } from './product.entity';

// Extend base interface với domain-specific methods
export interface IProductRepository extends IAggregateRepository<Product> {
  findByName(name: string): Promise<Product | null>;
  findByCategory(category: string): Promise<Product[]>;
  existsByName(name: string): Promise<boolean>;
}
```

### Tạo Domain Service Interface

```typescript
import { IUniquenessChecker } from '@core/domain';

// Domain-specific uniqueness checker
export type ProductUniqueFields = 'name' | 'sku';

export interface IProductUniquenessChecker extends ITypedUniquenessChecker<ProductUniqueFields> {}
```

## 🎯 Nguyên tắc DDD quan trọng

### 1. Aggregate Root là Transaction Boundary

```typescript
// ✅ Đúng: Modify thông qua Aggregate Root
const product = await repository.getById(id);
product.increaseStock(10); // Method trên Aggregate
await repository.save(product);

// ❌ Sai: Modify trực tiếp child entity
const orderItem = order.items[0];
orderItem.quantity = 5; // Bypass Aggregate Root!
```

### 2. Domain Events chỉ từ Aggregate Root

```typescript
// ✅ Đúng: Aggregate Root emit event
export class Order extends AggregateRoot {
  addItem(item: OrderItem): void {
    this._items.push(item);
    this.addDomainEvent(new OrderItemAddedEvent(this.id, item));
  }
}

// ❌ Sai: Child entity emit event
export class OrderItem extends BaseEntity {
  updateQuantity(qty: number): void {
    this.quantity = qty;
    this.addDomainEvent(...); // OrderItem không có method này!
  }
}
```

### 3. Validation trong Domain

```typescript
// ✅ Đúng: Business rules trong Entity
export class Product extends AggregateRoot {
  decreaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }
    if (this.stock < quantity) {
      throw new DomainException('Insufficient stock');
    }
    this._stock -= quantity;
  }
}

// ❌ Sai: Business rules trong Handler
export class DecreaseStockHandler {
  async execute(command: DecreaseStockCommand) {
    const product = await this.repo.getById(command.id);

    // Logic này nên ở trong Entity!
    if (product.stock < command.quantity) {
      throw new Error('Insufficient stock');
    }

    product.stock -= command.quantity;
  }
}
```

## 📚 References

- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [CQRS Pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)

## 🔗 Related Modules

- `@shared` - NestJS/Drizzle implementations
- `src/modules/*` - Feature modules using these abstractions
