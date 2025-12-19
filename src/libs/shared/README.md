# 📦 @shared - Infrastructure Implementations

## 📋 Tổng quan

`@shared` là library chứa các **implementations** (Adapters) cho các interfaces được định nghĩa trong `@core`.

Library này kết nối kiến trúc DDD/CQRS với các frameworks/libraries cụ thể:

- **NestJS** - Framework cho Dependency Injection, Controllers, etc.
- **Drizzle ORM** - Database access layer
- **Redis** - Caching
- **Pino** - Structured logging

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                        @core                                │
│              (Interfaces / Abstractions)                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  IEventBus  │  ICommandBus  │  IAggregateRepository │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ implements
┌──────────────────────────▼──────────────────────────────────┐
│                        @shared                              │
│                  (Implementations)                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │   EventBus   │  NestCommandBus  │  BaseAggregateRepo │   │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          Drizzle ORM  │  Redis  │  Pino            │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Cấu trúc thư mục

```
libs/shared/
├── database/                    # Database Infrastructure
│   ├── drizzle/                 # Drizzle ORM Integration
│   │   ├── database.module.ts
│   │   ├── database.provider.ts
│   │   ├── database.service.ts
│   │   ├── unit-of-work/
│   │   │   └── drizzle-unit-of-work.ts
│   │   └── schema/
│   │       └── outbox.schema.ts
│   │
│   ├── repositories/            # Base Repository Classes
│   │   ├── base-aggregate.repository.ts
│   │   └── base-read.dao.ts
│   │
│   └── outbox/                  # Transactional Outbox Pattern
│       ├── outbox.repository.ts
│       ├── outbox-processor.service.ts
│       └── outbox.module.ts
│
├── cqrs/                        # CQRS Infrastructure
│   ├── buses/
│   │   ├── nest-command-bus.ts
│   │   └── nest-query-bus.ts
│   ├── events/
│   │   └── event-bus.ts
│   ├── decorators/              # CQRS Decorators
│   │   ├── command.decorator.ts
│   │   ├── query.decorator.ts
│   │   └── events-handler.decorator.ts
│   └── cqrs.module.ts
│
├── http/                        # HTTP Infrastructure
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── interceptors/
│   │   └── response.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── dtos/
│       ├── pagination.dto.ts
│       └── response.dto.ts
│
├── context/                     # Request Context
│   ├── request-context.provider.ts
│   ├── correlation-id.middleware.ts
│   └── context.module.ts
│
├── caching/                     # Caching Infrastructure
│   ├── memory-cache.service.ts
│   └── redis-cache.service.ts
│
├── health/                      # Health Check
│   ├── health.controller.ts
│   ├── health.service.ts
│   └── indicators/
│       ├── database.health-indicator.ts
│       └── redis.health-indicator.ts
│
├── logging/                     # Structured Logging
│   └── logging.module.ts
│
└── shared.module.ts             # Main Module
```

## 🔧 Hướng dẫn sử dụng

### 1. Database & Repository

#### Tạo Repository mới

```typescript
// 1. Định nghĩa interface ở Domain Layer
// src/modules/order/domain/repositories/order.repository.interface.ts
import { IAggregateRepository } from '@core/domain';
import { Order } from '../entities';

export interface IOrderRepository extends IAggregateRepository<Order> {
  findByCustomerId(customerId: string): Promise<Order[]>;
}

// 2. Implement ở Infrastructure Layer
// src/modules/order/infrastructure/persistence/write/order.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { BaseAggregateRepository, SaveOptions, EVENT_BUS_TOKEN } from '@shared';
import { IEventBus, OUTBOX_REPOSITORY_TOKEN, IOutboxRepository } from '@core';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ordersTable } from '../drizzle/schema';
import {
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from '@shared';

@Injectable()
export class OrderRepository
  extends BaseAggregateRepository<Order>
  implements IOrderRepository
{
  constructor(
    @Inject(DATABASE_WRITE_TOKEN) private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) eventBus: IEventBus,
    @Inject(OUTBOX_REPOSITORY_TOKEN) outboxRepository: IOutboxRepository,
  ) {
    // Enable Outbox Pattern for production reliability
    super(eventBus, outboxRepository, { useOutbox: true });
  }

  protected async persist(
    aggregate: Order,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const model = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(ordersTable).values(model);
    } else {
      const result = await db
        .update(ordersTable)
        .set(model)
        .where(
          and(
            eq(ordersTable.id, aggregate.id),
            eq(ordersTable.version, expectedVersion),
          ),
        )
        .returning({ id: ordersTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<Order | null> {
    const result = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(ordersTable).where(eq(ordersTable.id, id));
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const results = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerId, customerId));

    return results.map(this.toDomain);
  }

  // Domain <-> Persistence mapping
  private toPersistence(entity: Order): OrderRecord {
    /* ... */
  }
  private toDomain(record: OrderRecord): Order {
    /* ... */
  }
}
```

#### Register Repository trong Module

```typescript
// src/modules/order/order.module.ts
@Module({
  imports: [SharedCqrsModule],
  providers: [
    OrderRepository,
    {
      provide: 'IOrderRepository',
      useExisting: OrderRepository,
    },
    // ... handlers
  ],
})
export class OrderModule {}
```

### 2. Transaction Management

#### Sử dụng Unit of Work

```typescript
// Trong Command Handler
@CommandHandler(TransferMoneyCommand)
export class TransferMoneyHandler implements ICommandHandler<TransferMoneyCommand> {
  constructor(
    @Inject(UNIT_OF_WORK_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject('IAccountRepository')
    private readonly accountRepo: IAccountRepository,
  ) {}

  async execute(command: TransferMoneyCommand): Promise<void> {
    // Wrap multiple operations in a transaction
    await this.unitOfWork.execute(async (ctx) => {
      const fromAccount = await this.accountRepo.getById(command.fromAccountId);
      const toAccount = await this.accountRepo.getById(command.toAccountId);

      fromAccount.withdraw(command.amount);
      toAccount.deposit(command.amount);

      // Both saves use same transaction
      await this.accountRepo.save(fromAccount, {
        transaction: ctx.transaction,
      });
      await this.accountRepo.save(toAccount, { transaction: ctx.transaction });
    });
  }
}
```

#### Transaction Options

```typescript
await this.unitOfWork.execute(
  async (ctx) => {
    // Your transactional code
  },
  {
    isolationLevel: 'serializable', // 'read committed' | 'repeatable read' | 'serializable'
    timeout: 5000, // Transaction timeout in ms
    readOnly: true, // For read-only transactions (optimization)
  },
);
```

### 3. Transactional Outbox Pattern

#### Cách hoạt động

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Handler                         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   Database Transaction                      │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ 1. Save Aggregate│    │ 2. Save Events to Outbox    │  │
│  │    (products)    │    │    (outbox table)           │  │
│  └──────────────────┘    └──────────────────────────────┘  │
│                     COMMIT (atomic)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Outbox Processor (Background)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Poll outbox table for PENDING events              │  │
│  │ 2. Publish to Event Bus                              │  │
│  │ 3. Mark as PROCESSED                                 │  │
│  │ 4. Retry on failure (max 3 times)                    │  │
│  │ 5. Cleanup old PROCESSED entries                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Enable Outbox trong Repository

```typescript
export class ProductRepository extends BaseAggregateRepository<Product> {
  constructor(
    @Inject(DATABASE_WRITE_TOKEN) private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) eventBus: IEventBus,
    @Inject(OUTBOX_REPOSITORY_TOKEN) outboxRepository: IOutboxRepository,
  ) {
    // Enable Outbox Pattern
    super(eventBus, outboxRepository, { useOutbox: true });
  }
}
```

### 4. Request Context & Correlation ID

#### Setup Middleware

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ContextModule, CorrelationIdMiddleware } from '@shared';

@Module({
  imports: [ContextModule /* ... */],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

#### Sử dụng trong Code

```typescript
import { IRequestContextProvider, REQUEST_CONTEXT_TOKEN } from '@core';

@Injectable()
export class CreateProductHandler {
  constructor(
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly contextProvider: IRequestContextProvider,
  ) {}

  async execute(command: CreateProductCommand): Promise<string> {
    const context = this.contextProvider.current();

    // Include correlation ID in domain event
    const product = Product.create(productId, props);
    product.addDomainEvent(
      new ProductCreatedEvent(product.id, data, {
        correlationId: context?.correlationId,
        userId: context?.userId,
      }),
    );
  }
}
```

### 5. Thêm Database Table mới

#### Step 1: Tạo Schema

```typescript
// src/modules/order/infrastructure/persistence/drizzle/schema/order.schema.ts
import {
  pgTable,
  varchar,
  timestamp,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';

export const ordersTable = pgTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrderRecord = typeof ordersTable.$inferSelect;
export type NewOrderRecord = typeof ordersTable.$inferInsert;
```

#### Step 2: Tạo Migration

```bash
# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg
```

#### Step 3: Export Schema

```typescript
// src/app.module.ts - Add schema to DrizzleDatabaseModule.forRoot()
import { ordersTable } from './modules/order/infrastructure/persistence/drizzle/schema';

const schema = {
  // ... existing tables
  ordersTable,
};
```

## 🔒 Error Handling

### Global Exception Filter

Tất cả exceptions được handle tự động bởi `GlobalExceptionFilter`:

| Exception Type          | HTTP Status               |
| ----------------------- | ------------------------- |
| `DomainException`       | 400 Bad Request           |
| `ValidationException`   | 400 Bad Request           |
| `NotFoundException`     | 404 Not Found             |
| `UnauthorizedException` | 401 Unauthorized          |
| `ForbiddenException`    | 403 Forbidden             |
| `ConcurrencyException`  | 409 Conflict              |
| `ConflictException`     | 409 Conflict              |
| Other errors            | 500 Internal Server Error |

### Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/products",
  "method": "POST",
  "error": {
    "name": "DomainException",
    "code": "PRODUCT_NAME_DUPLICATE",
    "message": "Product with name 'iPhone' already exists",
    "details": { "name": "iPhone" }
  }
}
```

## 📊 Health Checks

```typescript
// Endpoint: GET /health
{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "UP",
      "message": "Database connection is healthy",
      "latency": 5
    },
    "redis": {
      "status": "UP",
      "message": "Redis connection is healthy"
    }
  }
}
```

## 🔗 Related Modules

- `@core` - Pure abstractions (interfaces, base classes)
- `src/modules/*` - Feature modules using these implementations
