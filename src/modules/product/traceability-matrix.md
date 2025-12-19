# Product Module - Traceability Matrix

> **Purpose**: Tài liệu này đối chiếu việc sử dụng các thành phần từ Core/Shared Kernel trong Product Module và Order Module, xác định các tính năng đã triển khai.

---

## 1. Core Inventory (Danh sách thành phần Core)

### 1.1 Domain Layer (`src/libs/core/domain`)

| Component                                                 | Tính năng/Tác dụng                                                                                               | Cách sử dụng chuẩn                                                                |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `AggregateRoot`                                           | Base class cho Aggregate trong DDD. Cung cấp: version control (OCC), domain events management, audit timestamps. | Extend class này cho root entity. Chỉ Aggregate Root mới được emit events.        |
| `BaseEntity`                                              | Base class cho Entity con. Cung cấp: id, createdAt, updatedAt, equals comparison.                                | Extend cho các entity không phải root (OrderItem trong Order).                    |
| `BaseValueObject`                                         | Base class cho Value Object. Cung cấp: equality by value, immutability pattern.                                  | Extend và implement `getEqualityComponents()`. Tất cả props phải readonly.        |
| `ISoftDeletable`                                          | Interface cho soft delete pattern. Cung cấp: deletedAt, isDeleted, delete(), restore().                          | Implement interface này cho entities hỗ trợ soft delete.                          |
| `IDomainEvent` / `BaseDomainEvent<TData>`                 | Interface/Base class cho Domain Events. Type-safe payload với generics.                                          | Extend `BaseDomainEvent` với TData là payload type. Events phải immutable.        |
| `DomainException`                                         | Exception cho domain validation errors.                                                                          | Throw khi vi phạm business rules trong domain.                                    |
| `IAggregateRepository<T>`                                 | Interface cho repository của Aggregate. Định nghĩa save, getById, delete.                                        | Domain layer chỉ định nghĩa interface (Port). Infrastructure implement (Adapter). |
| `BaseService`                                             | Abstract base class cho Domain Services.                                                                         | Extend cho các services chứa business logic không thuộc entity cụ thể.            |
| `IUniquenessChecker` / `ITypedUniquenessChecker<TFields>` | Interface để kiểm tra tính duy nhất.                                                                             | Domain Service inject interface này, Infrastructure implement.                    |
| `IStockAdjustmentItem` / `IStockAdjustmentResult`         | Interfaces cho bulk operations.                                                                                  | Dùng trong Domain Services xử lý batch operations.                                |
| `ISpecification<T>` / `BaseSpecification<T>`              | Interface/Base class cho Specification Pattern. Cung cấp: and(), or(), not() combinators.                        | Extend BaseSpecification và implement `isSatisfiedBy()`. Dùng cho business rules. |

### 1.2 Application Layer (`src/libs/core/application`)

| Component                            | Tính năng/Tác dụng                                                    | Cách sử dụng chuẩn                                                             |
| :----------------------------------- | :-------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `ICommand`                           | Marker interface cho Commands (Write operations).                     | Implement interface này cho mỗi command class.                                 |
| `ICommandBus`                        | Interface cho Command Bus (Mediator pattern).                         | Inject `COMMAND_BUS_TOKEN` để execute commands.                                |
| `ICommandHandler<TCommand, TResult>` | Interface cho Command Handler.                                        | Implement handler với business orchestration logic.                            |
| `IQuery<TResult>`                    | Interface với Phantom Type cho Query result inference.                | Implement interface để QueryBus tự động infer return type.                     |
| `IQueryBus`                          | Interface cho Query Bus.                                              | Inject `QUERY_BUS_TOKEN` để execute queries.                                   |
| `IQueryHandler<TQuery, TResult>`     | Interface cho Query Handler.                                          | Implement handler với read-side logic.                                         |
| `BaseProjection<TEvent>`             | Base class cho Projections (Read Model updaters).                     | Extend để handle domain events và update read database. Implement idempotency. |
| `IProjection<TEvent>`                | Interface cho Projection.                                             | Alternative cho BaseProjection nếu cần flexibility.                            |
| `IIdempotentCommand`                 | Interface cho idempotent commands với `idempotencyKey`.               | Implement cho commands cần retry-safe execution.                               |
| `IdempotencyOptions`                 | Configuration options cho idempotency (TTL, keyPrefix, returnCached). | Pass vào `@Idempotent()` decorator.                                            |

### 1.3 Infrastructure Layer (`src/libs/core/infrastructure`)

| Component                             | Tính năng/Tác dụng                                           | Cách sử dụng chuẩn                                           |
| :------------------------------------ | :----------------------------------------------------------- | :----------------------------------------------------------- |
| `IEventBus`                           | Interface cho Event Bus (publish/subscribe).                 | Dùng để publish domain events sau khi save aggregate.        |
| `BaseAggregateRepository<T>`          | Abstract repository với domain events handling, OCC support. | Extend và implement `persist()`, `getById()`, `delete()`.    |
| `BaseReadDao`                         | Base class cho Read DAO (Query Side).                        | Extend cho read-optimized queries. Không có business logic.  |
| `IUnitOfWork` / `ITransactionContext` | Interface cho Unit of Work pattern.                          | Dùng khi cần transaction span multiple aggregates.           |
| `ICacheService`                       | Interface cho caching operations.                            | Inject để cache read queries.                                |
| `IOutboxRepository` / `IOutboxEntry`  | Interface cho Transactional Outbox Pattern.                  | Enable reliable event publishing với at-least-once delivery. |

### 1.4 Common Layer (`src/libs/core/common`)

| Component                                      | Tính năng/Tác dụng                                            | Cách sử dụng chuẩn                                                 |
| :--------------------------------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------- |
| `BaseException`                                | Base exception class với code, message, details.              | Extend cho custom exception types.                                 |
| `DomainException`                              | Domain validation errors.                                     | Throw trong domain layer khi vi phạm business rules.               |
| `ValidationException`                          | Input validation errors.                                      | Throw trong application layer cho input validation.                |
| `NotFoundException`                            | Entity not found. Static factory methods: `entity(type, id)`. | Throw khi query không tìm thấy entity.                             |
| `ConcurrencyException`                         | Optimistic concurrency conflict.                              | Throw khi version mismatch trong OCC.                              |
| `ConflictException`                            | Business conflict (duplicate, state conflict).                | Throw khi có conflict business logic.                              |
| `BusinessRuleException`                        | Complex business rule violations.                             | Throw cho multi-field/cross-entity validation.                     |
| `UnauthorizedException` / `ForbiddenException` | Auth errors.                                                  | Throw cho authentication/authorization failures.                   |
| `IRequestContext` / `IRequestContextProvider`  | Request-scoped context (correlation ID, user ID, tenant ID).  | Inject provider để add context vào events cho distributed tracing. |

### 1.5 Shared - CQRS Module (`src/libs/shared/cqrs`)

| Component                               | Tính năng/Tác dụng                                                                       | Cách sử dụng chuẩn                                                          |
| :-------------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `SharedCqrsModule`                      | Global module cung cấp CQRS infrastructure. Exports Command/Query/Event buses.           | Import vào AppModule hoặc feature modules.                                  |
| `NestCommandBus`                        | Implementation của `ICommandBus` sử dụng @nestjs/cqrs.                                   | Inject via `COMMAND_BUS_TOKEN`.                                             |
| `NestQueryBus`                          | Implementation của `IQueryBus` sử dụng @nestjs/cqrs.                                     | Inject via `QUERY_BUS_TOKEN`.                                               |
| `EventBus`                              | Implementation của `IEventBus`. Hỗ trợ cả @nestjs/cqrs handlers và custom subscriptions. | Inject via `EVENT_BUS_TOKEN`. Publish domain events sau khi save aggregate. |
| `@CommandHandler(Command)`              | Decorator để đăng ký Command Handler với NestJS CQRS.                                    | Decorate handler class, implement `ICommandHandler`.                        |
| `@QueryHandler(Query)`                  | Decorator để đăng ký Query Handler với NestJS CQRS.                                      | Decorate handler class, implement `IQueryHandler`.                          |
| `@EventsHandler(Event1, Event2, ...)`   | Decorator để đăng ký Event Handler (Projection) với NestJS CQRS.                         | Decorate projection class, implement `IEventHandler`.                       |
| `COMMAND_BUS_TOKEN` / `QUERY_BUS_TOKEN` | DI Tokens cho buses.                                                                     | Dùng với `@Inject()` để inject buses.                                       |
| `EVENT_BUS_TOKEN`                       | DI Token cho Event Bus.                                                                  | Dùng với `@Inject()` để inject event bus.                                   |
| `IdempotencyService`                    | Service xử lý idempotency cho commands. Hỗ trợ cache hoặc in-memory storage.             | Inject vào handler, dùng kết hợp với `@Idempotent()` decorator.             |
| `@Idempotent(options?)`                 | Decorator đánh dấu method là idempotent. Tự động cache result và skip duplicate.         | Decorate `execute()` method trong handler. Command cần có `idempotencyKey`. |

### 1.6 Shared - Database Module (`src/libs/shared/database`)

| Component                          | Tính năng/Tác dụng                                                                   | Cách sử dụng chuẩn                                                               |
| :--------------------------------- | :----------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| `DrizzleDatabaseModule`            | Dynamic module cung cấp Drizzle ORM connections (read/write).                        | Import với `.forRoot({ schema })` trong AppModule.                               |
| `DATABASE_WRITE_TOKEN`             | DI Token cho write database connection.                                              | Inject vào repositories để write operations.                                     |
| `DATABASE_READ_TOKEN`              | DI Token cho read database connection.                                               | Inject vào DAOs cho read operations. Có thể point tới read replica.              |
| `DrizzleDB` / `DrizzleTransaction` | TypeScript types cho Drizzle database và transaction.                                | Type hint cho injected database connections.                                     |
| `DrizzleUnitOfWork`                | Implementation của `IUnitOfWork` cho Drizzle ORM. Hỗ trợ isolation levels, timeouts. | Inject via `UNIT_OF_WORK_TOKEN`. Dùng `execute()` method.                        |
| `BaseAggregateRepository`          | Base class cho repositories với OCC, domain events, optional Outbox Pattern.         | Extend và implement `persist()`, `getById()`, `delete()`.                        |
| `BaseReadDao`                      | Base class cho Read DAOs với pagination utilities.                                   | Extend và implement `executeQuery()`.                                            |
| `OutboxModule`                     | Module cung cấp Transactional Outbox Pattern.                                        | Import vào AppModule để enable reliable event publishing.                        |
| `OutboxRepository`                 | Implementation của `IOutboxRepository`. Lưu events vào outbox table.                 | Inject via `OUTBOX_REPOSITORY_TOKEN`. Dùng trong repositories khi enable outbox. |
| `OutboxProcessorService`           | Background service poll và publish pending events từ outbox.                         | Auto-start khi module init. Configurable polling interval, batch size, retries.  |
| `outboxTable`                      | Drizzle schema cho outbox table.                                                     | Thêm vào database migrations.                                                    |

### 1.7 Shared - HTTP Module (`src/libs/shared/http`)

| Component                 | Tính năng/Tác dụng                                                                      | Cách sử dụng chuẩn                                                                      |
| :------------------------ | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `GlobalExceptionFilter`   | Exception filter maps domain exceptions sang HTTP responses. Standardized error format. | Register globally trong `main.ts`: `app.useGlobalFilters(new GlobalExceptionFilter())`. |
| `ResponseInterceptor`     | Interceptor wrap responses trong standardized format `{ success, data, ... }`.          | Register globally: `app.useGlobalInterceptors(new ResponseInterceptor())`.              |
| `ValidationPipe`          | Pipe cho input validation sử dụng class-validator.                                      | Register globally với transform options.                                                |
| `PaginationDto`           | DTO cho pagination parameters (page, limit, sortBy, sortOrder).                         | Dùng trong query endpoints. Có validation methods.                                      |
| `PaginatedResponseDto<T>` | DTO cho paginated responses với metadata (totalPages, hasNext, etc.).                   | Return từ list endpoints.                                                               |
| `SuccessResponseDto<T>`   | DTO cho successful responses. Static factories: `ok()`, `created()`, `noContent()`.     | Dùng trong ResponseInterceptor hoặc manual responses.                                   |
| `ApiResponse<T>`          | Interface định nghĩa chuẩn API response structure.                                      | Type hint cho responses.                                                                |

### 1.8 Shared - Caching Module (`src/libs/shared/caching`)

| Component             | Tính năng/Tác dụng                                                          | Cách sử dụng chuẩn                                                      |
| :-------------------- | :-------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `MemoryCacheService`  | In-memory implementation của `ICacheService`. Auto cleanup expired entries. | Inject via `CACHE_SERVICE_TOKEN`. Good for development/single instance. |
| `RedisCacheService`   | Redis implementation của `ICacheService`. Distributed caching.              | Inject via `CACHE_SERVICE_TOKEN`. Good for production/multi-instance.   |
| `CacheOptions`        | Configuration interface cho cache services (TTL, key prefix, etc.).         | Pass vào constructor của cache service.                                 |
| `CACHE_SERVICE_TOKEN` | DI Token cho cache service.                                                 | Dùng với `@Inject()` để inject cache service.                           |

### 1.9 Shared - Context Module (`src/libs/shared/context`)

| Component                 | Tính năng/Tác dụng                                                   | Cách sử dụng chuẩn                                                        |
| :------------------------ | :------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| `ContextModule`           | Module cung cấp request context management.                          | Import vào AppModule.                                                     |
| `RequestContextProvider`  | Implementation của `IRequestContextProvider` dùng AsyncLocalStorage. | Inject via `REQUEST_CONTEXT_TOKEN`. Dùng `current()` để lấy context.      |
| `CorrelationIdMiddleware` | Middleware extract/generate correlation ID, setup request context.   | Apply globally: `consumer.apply(CorrelationIdMiddleware).forRoutes('*')`. |
| `CORRELATION_ID_HEADER`   | Constant cho header name: `x-correlation-id`.                        | Dùng khi propagate correlation ID qua HTTP calls.                         |
| `REQUEST_CONTEXT_TOKEN`   | DI Token cho request context provider.                               | Dùng với `@Inject()` để inject provider.                                  |

### 1.10 Shared - Health Module (`src/libs/shared/health`)

| Component                 | Tính năng/Tác dụng                                                    | Cách sử dụng chuẩn                                |
| :------------------------ | :-------------------------------------------------------------------- | :------------------------------------------------ |
| `HealthModule`            | Module cung cấp health check endpoints.                               | Import vào AppModule. Exposes `/health` endpoint. |
| `HealthController`        | Controller với endpoints: `/health`, `/health/live`, `/health/ready`. | Auto-registered khi import HealthModule.          |
| `HealthService`           | Service aggregates health indicators.                                 | Inject nếu cần custom health logic.               |
| `DatabaseHealthIndicator` | Health indicator check database connectivity.                         | Auto-registered khi database module imported.     |
| `RedisHealthIndicator`    | Health indicator check Redis connectivity.                            | Auto-registered khi Redis configured.             |

### 1.11 Shared - Logging Module (`src/libs/shared/logging`)

| Component       | Tính năng/Tác dụng                                                      | Cách sử dụng chuẩn                                              |
| :-------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `LoggingModule` | Module cung cấp structured logging với Pino.                            | Import vào AppModule. Auto-configures NestJS logger.            |
| Pino Logger     | High-performance JSON logger. Supports log levels, pretty print in dev. | Dùng NestJS `Logger` class bình thường, output được structured. |

---

## 2. Usage Matrix (Đối chiếu sử dụng)

### 2.1 Domain Layer Components

| Thành phần Core               | Trạng thái | Vị trí trong Product/Order Module                       | Nhận xét                                                                        |
| :---------------------------- | :--------- | :------------------------------------------------------ | :------------------------------------------------------------------------------ |
| `AggregateRoot`               | ✅ Đã dùng | `Product.entity.ts`, `Order.entity.ts`                  | Product và Order extends AggregateRoot đúng chuẩn. Có version, domain events.   |
| `BaseEntity`                  | ✅ Đã dùng | `OrderItem.entity.ts`                                   | OrderItem extends BaseEntity (child entity of Order).                           |
| `BaseValueObject`             | ✅ Đã dùng | `Price`, `ProductId`, `Money`, `OrderId`, `OrderStatus` | Tất cả Value Objects đều extend BaseValueObject. Có validation và immutability. |
| `ISoftDeletable`              | ✅ Đã dùng | `Product.entity.ts`                                     | Product implements ISoftDeletable với deletedAt, delete(), restore().           |
| `BaseDomainEvent<TData>`      | ✅ Đã dùng | Product events + Order events                           | ProductCreatedEvent, OrderPlacedEvent, OrderCancelledEvent, etc. đều type-safe. |
| `DomainException`             | ✅ Đã dùng | Toàn bộ domain layer                                    | Dùng cho validation: name required, price negative, insufficient stock.         |
| `IAggregateRepository`        | ✅ Đã dùng | `IProductRepository`, `IOrderRepository`                | Cả hai repository interfaces đều extends IAggregateRepository.                  |
| `BaseService`                 | ✅ Đã dùng | `BulkStockAdjustmentService`, `OrderValidationService`  | **IMPLEMENTED**: Cả hai services đều extend BaseService.                        |
| `ITypedUniquenessChecker`     | ✅ Đã dùng | `IProductUniquenessChecker`                             | IProductUniquenessChecker extends ITypedUniquenessChecker<'name' \| 'sku'>.     |
| `IStockAdjustmentItem/Result` | ✅ Đã dùng | `BulkStockAdjustmentService`                            | Re-export và sử dụng đúng interfaces.                                           |
| `BaseSpecification<T>`        | ✅ Đã dùng | `src/modules/product/domain/specifications/`            | **NEW**: 12 product specifications cho business rules validation.               |

### 2.2 Application Layer Components

| Thành phần Core      | Trạng thái  | Vị trí trong Product/Order Module                            | Nhận xét                                                       |
| :------------------- | :---------- | :----------------------------------------------------------- | :------------------------------------------------------------- |
| `ICommand`           | ✅ Đã dùng  | Product commands + `PlaceOrderCommand`, `CancelOrderCommand` | Tất cả commands implement ICommand.                            |
| `ICommandBus`        | ✅ Đã dùng  | Controllers                                                  | Both controllers inject và sử dụng commandBus.execute().       |
| `ICommandHandler`    | ✅ Đã dùng  | Tất cả command handlers                                      | Tất cả handlers implement interface đúng.                      |
| `IQuery<TResult>`    | ✅ Đã dùng  | Product queries + `GetOrderQuery`, `GetOrderListQuery`       | Queries với Phantom Type.                                      |
| `IQueryBus`          | ✅ Đã dùng  | Controllers                                                  | Both controllers inject và sử dụng queryBus.execute().         |
| `IQueryHandler`      | ✅ Đã dùng  | Tất cả query handlers                                        | `GetProductHandler`, `GetOrderHandler`, `GetOrderListHandler`. |
| `BaseProjection`     | ✅ Đã dùng  | `ProductReadModelProjection`, `OrderReadModelProjection`     | **IMPLEMENTED**: Cả hai projections xử lý domain events.       |
| `IIdempotentCommand` | ✅ Sẵn sàng | Commands cần idempotency                                     | **NEW**: Interface và decorator sẵn sàng cho production use.   |

### 2.3 Infrastructure Layer Components

| Thành phần Core           | Trạng thái | Vị trí trong Product/Order Module         | Nhận xét                                                          |
| :------------------------ | :--------- | :---------------------------------------- | :---------------------------------------------------------------- |
| `IEventBus`               | ✅ Đã dùng | `ProductRepository`, `OrderRepository`    | Cả hai repositories inject eventBus để publish events.            |
| `BaseAggregateRepository` | ✅ Đã dùng | `ProductRepository`, `OrderRepository`    | Cả hai extends BaseAggregateRepository với OCC, event publishing. |
| `BaseReadDao`             | ✅ Đã dùng | `ProductReadDao`, `OrderReadDao`          | **IMPLEMENTED**: Cả hai DAOs extend BaseReadDao.                  |
| `IUnitOfWork`             | ✅ Đã dùng | `PlaceOrderHandler`, `CancelOrderHandler` | **IMPLEMENTED**: UnitOfWork demo multi-aggregate transaction.     |
| `ICacheService`           | ✅ Đã dùng | `ProductReadDao`, `OrderReadDao`          | **IMPLEMENTED**: Cả hai DAOs hỗ trợ optional caching.             |
| `IOutboxRepository`       | ✅ Đã dùng | `ProductRepository`, `OrderRepository`    | **IMPLEMENTED**: Cả hai repositories hỗ trợ Outbox Pattern.       |

### 2.4 Common Layer Components

| Thành phần Core         | Trạng thái | Vị trí trong Product/Order Module                 | Nhận xét                                                                        |
| :---------------------- | :--------- | :------------------------------------------------ | :------------------------------------------------------------------------------ |
| `BaseException`         | ✅ Đã dùng | (Gián tiếp qua các exception types)               | Tất cả exceptions extend BaseException.                                         |
| `DomainException`       | ✅ Đã dùng | Domain layer toàn bộ                              | Validation: name, price, stock, order items.                                    |
| `NotFoundException`     | ✅ Đã dùng | Query handlers, Command handlers                  | `NotFoundException.entity('Product', id)`, `NotFoundException.entity('Order')`. |
| `ConcurrencyException`  | ✅ Đã dùng | `ProductRepository`, `OrderRepository`            | OCC check trong persist().                                                      |
| `ConflictException`     | ✅ Đã dùng | `ProductUniquenessService`, `CancelOrderHandler`  | **IMPLEMENTED**: Duplicate detection, invalid state transitions.                |
| `BusinessRuleException` | ✅ Đã dùng | `OrderValidationService`, `CancelOrderHandler`    | **IMPLEMENTED**: Min order value, max items, max quantity per item.             |
| `IRequestContext`       | ✅ Đã dùng | `CreateProductHandler`, `PlaceOrderHandler`, etc. | **IMPLEMENTED**: Tất cả handlers thêm metadata vào domain events.               |

### 2.5 Shared Components Usage

| Thành phần Shared         | Trạng thái  | Vị trí sử dụng                                           | Nhận xét                                                  |
| :------------------------ | :---------- | :------------------------------------------------------- | :-------------------------------------------------------- |
| `SharedCqrsModule`        | ✅ Đã dùng  | `ProductModule`, `OrderModule`                           | Import để có access đến CQRS infrastructure.              |
| `NestCommandBus`          | ✅ Đã dùng  | Controllers                                              | Inject via token, execute commands.                       |
| `NestQueryBus`            | ✅ Đã dùng  | Controllers                                              | Inject via token, execute queries.                        |
| `EventBus`                | ✅ Đã dùng  | Repositories                                             | Inject via token, publish domain events.                  |
| `@CommandHandler`         | ✅ Đã dùng  | Tất cả command handlers                                  | Decorate tất cả command handlers.                         |
| `@QueryHandler`           | ✅ Đã dùng  | Tất cả query handlers                                    | Decorate tất cả query handlers.                           |
| `@EventsHandler`          | ✅ Đã dùng  | `ProductReadModelProjection`, `OrderReadModelProjection` | Decorate projections để handle events.                    |
| `DrizzleDatabaseModule`   | ✅ Đã dùng  | `app.module.ts`                                          | Import globally với full schema.                          |
| `DATABASE_WRITE_TOKEN`    | ✅ Đã dùng  | Repositories                                             | Inject write database connection.                         |
| `DATABASE_READ_TOKEN`     | ✅ Đã dùng  | DAOs                                                     | Inject read database connection.                          |
| `DrizzleUnitOfWork`       | ✅ Đã dùng  | `PlaceOrderHandler`, `CancelOrderHandler`                | **IMPLEMENTED**: Multi-aggregate transaction demo.        |
| `BaseAggregateRepository` | ✅ Đã dùng  | `ProductRepository`, `OrderRepository`                   | Cả hai extend với OCC và event handling.                  |
| `BaseReadDao`             | ✅ Đã dùng  | `ProductReadDao`, `OrderReadDao`                         | Cả hai extend với caching support.                        |
| `OutboxModule`            | ✅ Đã dùng  | `app.module.ts`                                          | **IMPLEMENTED**: Import để enable Outbox Pattern.         |
| `OutboxRepository`        | ✅ Đã dùng  | Repositories                                             | **IMPLEMENTED**: Optional inject để store events.         |
| `GlobalExceptionFilter`   | ✅ Đã dùng  | `main.ts`                                                | Global filter cho standardized error responses.           |
| `ResponseInterceptor`     | ✅ Đã dùng  | `main.ts`                                                | Global interceptor cho standardized success responses.    |
| `MemoryCacheService`      | ✅ Sẵn sàng | DAOs                                                     | Có thể inject. ProductReadDao và OrderReadDao đã support. |
| `RequestContextProvider`  | ✅ Đã dùng  | Command handlers                                         | **IMPLEMENTED**: Inject để lấy correlationId cho events.  |
| `CorrelationIdMiddleware` | ✅ Đã dùng  | `app.module.ts`                                          | **IMPLEMENTED**: Apply globally cho mọi request.          |
| `HealthModule`            | ✅ Đã dùng  | `app.module.ts`                                          | Health check endpoints available.                         |
| `LoggingModule`           | ✅ Đã dùng  | `app.module.ts`                                          | Structured logging với Pino.                              |
| `IdempotencyService`      | ✅ Sẵn sàng | Command handlers                                         | **NEW**: Inject để enable idempotent command execution.   |
| `@Idempotent()`           | ✅ Sẵn sàng | Command handler methods                                  | **NEW**: Decorator cho retry-safe command execution.      |
| `RateLimitModule`         | ✅ Sẵn sàng | `app.module.ts`                                          | **NEW**: Rate limiting với ThrottlerGuard (3 tiers).      |

---

## 3. Gap Analysis (Phân tích Gap - COMPLETED)

### 3.1 All Gaps Resolved ✅

|  #  | Gap                                        | Priority | Status  | Implementation                                                                            |
| :-: | :----------------------------------------- | :------- | :------ | :---------------------------------------------------------------------------------------- |
|  1  | **BaseProjection** không được sử dụng      | High     | ✅ DONE | `ProductReadModelProjection`, `OrderReadModelProjection` xử lý domain events.             |
|  2  | **IRequestContext** không được sử dụng     | Medium   | ✅ DONE | Tất cả command handlers inject RequestContextProvider, thêm metadata vào events.          |
|  3  | **Outbox Pattern** không được enable       | Medium   | ✅ DONE | Repositories hỗ trợ Outbox Pattern, `OutboxModule` imported trong `AppModule`.            |
|  4  | **ICacheService** không được sử dụng       | Low      | ✅ DONE | `ProductReadDao`, `OrderReadDao` có caching layer với cache invalidation qua Projection.  |
|  5  | **IUnitOfWork** không được demo            | High     | ✅ DONE | `PlaceOrderHandler`, `CancelOrderHandler` demo multi-aggregate transaction.               |
|  6  | **ConflictException** không được sử dụng   | Medium   | ✅ DONE | `ProductUniquenessService` cho duplicate detection, `CancelOrderHandler` cho state check. |
|  7  | **BusinessRuleException** không được demo  | Medium   | ✅ DONE | `OrderValidationService` validates min order value, max items, max quantity.              |
|  8  | **Raw SQL / QueryBuilder** không được demo | Low      | ✅ DONE | `ProductRepository.search()`, `getStatistics()` demo complex queries.                     |
|  9  | **CorrelationIdMiddleware** không apply    | Low      | ✅ DONE | Applied globally trong `AppModule.configure()`.                                           |
| 10  | **Order Read Side** thiếu                  | Medium   | ✅ DONE | `OrderReadDao`, `GetOrderQuery`, `GetOrderListQuery` handlers implemented.                |

---

## 4. Implemented Demos

### 4.1 ProductReadModelProjection ✅

**File:** `src/modules/product/infrastructure/projections/product-read-model.projection.ts`

**Purpose:** Lắng nghe ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent và thực hiện:

- Log structured events cho monitoring
- Invalidate cache khi product thay đổi
- Cung cấp hook points cho Elasticsearch indexing, notifications

### 4.2 Request Context Integration ✅

**Files Modified:** Tất cả Command Handlers

**Purpose:** Thêm correlationId, causationId, userId vào domain events để hỗ trợ distributed tracing.

### 4.3 Outbox Pattern ✅

**Files Modified:** `ProductRepository`, `OrderRepository`, `app.module.ts`

**Purpose:** Enable at-least-once delivery cho domain events, đảm bảo reliability.

### 4.4 Caching Layer ✅

**Files:** `ProductReadDao`, `OrderReadDao`

**Purpose:** Cache read queries để giảm database load, với automatic invalidation qua Projection.

### 4.5 IUnitOfWork Demo ✅ (NEW)

**Files:**

- `src/modules/order/application/commands/handlers/place-order.handler.ts`
- `src/modules/order/application/commands/handlers/cancel-order.handler.ts`

**Purpose:** Demo multi-aggregate transaction:

- PlaceOrderHandler: Create order + decrease stock for all products atomically
- CancelOrderHandler: Cancel order + restore stock (compensating action)

**Key Features:**

- Transaction spans multiple aggregates (Order + Products)
- Automatic rollback if any step fails
- Demonstrates Saga-like compensation pattern

### 4.6 ConflictException Usage ✅ (NEW)

**Files:**

- `src/modules/product/domain/services/product-uniqueness.service.ts`
- `src/modules/order/application/commands/handlers/cancel-order.handler.ts`

**Purpose:**

- Duplicate resource detection (Product name/SKU)
- Invalid state transition detection (Order cancellation)

**Usage Example:**

```typescript
// Duplicate detection
throw ConflictException.duplicate('Product', 'name', productName);

// State conflict
throw ConflictException.invalidState(
  'Order',
  'SHIPPED',
  'PENDING or CONFIRMED',
);
```

### 4.7 BusinessRuleException Usage ✅ (NEW)

**File:** `src/modules/order/domain/services/order-validation.service.ts`

**Purpose:** Validate complex business rules for orders:

- Minimum order value ($10)
- Maximum items per order (50)
- Maximum quantity per item (100)
- Currency restrictions

**Usage Example:**

```typescript
const validationService = new OrderValidationService();
validationService.validateOrderRules({
  items: orderItems,
  totalAmount: calculatedTotal,
});
// Throws BusinessRuleException if any rule violated
```

### 4.8 Raw SQL / QueryBuilder Demo ✅ (NEW)

**File:** `src/modules/product/infrastructure/persistence/write/product.repository.ts`

**New Methods:**

- `search(criteria)`: Dynamic QueryBuilder with multiple optional filters
- `getStatistics(threshold)`: Raw SQL aggregations (COUNT, SUM, AVG, GROUP BY)
- `findLowStock(threshold)`: Simple condition-based filtering

**Features Demonstrated:**

- Dynamic WHERE conditions building
- LIKE patterns for partial match
- BETWEEN for range queries
- Raw SQL aggregations
- GROUP BY clauses
- Conditional aggregations (CASE WHEN)

### 4.9 Order Read Side ✅ (NEW)

**Files:**

- `src/modules/order/infrastructure/persistence/read/order-read-dao.ts`
- `src/modules/order/application/queries/get-order.query.ts`
- `src/modules/order/application/queries/get-order-list.query.ts`
- `src/modules/order/application/queries/handlers/`
- `src/modules/order/infrastructure/projections/order-read-model.projection.ts`

**Purpose:** Complete CQRS read side for Order module:

- Read-optimized DAO with caching
- Query handlers for single and list queries
- Pagination and filtering support
- Projection for event handling and cache invalidation

### 4.10 Specification Pattern ✅ (NEW - Dec 2025)

**Files:**

- `src/libs/core/domain/specifications/specification.interface.ts`
- `src/modules/product/domain/specifications/product.specifications.ts`

**Purpose:** Encapsulate business rules as reusable, composable specifications.

**Specifications Created:**

| Specification                   | Purpose                                     |
| :------------------------------ | :------------------------------------------ |
| `InStockSpecification`          | Check if product has stock > 0              |
| `OutOfStockSpecification`       | Check if product has stock = 0              |
| `LowStockSpecification`         | Check if stock is below threshold           |
| `PriceBelowSpecification`       | Check if price is below limit               |
| `PriceAboveSpecification`       | Check if price is above limit               |
| `PriceRangeSpecification`       | Check if price is within range              |
| `CategorySpecification`         | Check if product is in category             |
| `NotDeletedSpecification`       | Check if product is not soft-deleted        |
| `NameContainsSpecification`     | Check if name contains text                 |
| `SufficientStockSpecification`  | Check if stock is sufficient for quantity   |
| `AvailableProductSpecification` | Composite: In stock AND not deleted         |
| `NeedsRestockSpecification`     | Composite: (Low OR out of stock) AND active |

**Usage Example:**

```typescript
// Check if product is available for purchase
const available = new AvailableProductSpecification();
if (available.isSatisfiedBy(product)) {
  // Product is in stock and not deleted
}

// Combine specifications dynamically
const affordable = new PriceBelowSpecification(100);
const inStock = new InStockSpecification();
const affordableInStock = affordable.and(inStock);

// Use in queries
const products = allProducts.filter((p) => affordableInStock.isSatisfiedBy(p));
```

### 4.11 Idempotency Pattern ✅ (NEW - Dec 2025)

**Files:**

- `src/libs/core/application/commands/interfaces/idempotent-command.interface.ts`
- `src/libs/shared/cqrs/idempotency/idempotency.service.ts`
- `src/libs/shared/cqrs/idempotency/idempotent.decorator.ts`

**Purpose:** Enable safe retries for commands without causing duplicate side effects.

**Key Features:**

- `IIdempotentCommand` interface with `idempotencyKey`
- `@Idempotent()` decorator for handler methods
- Configurable TTL, key prefix, and behavior
- Supports both cache-based and in-memory storage
- Automatic result caching and duplicate detection

**Usage Example:**

```typescript
// 1. Command implements IIdempotentCommand
class CreateOrderCommand implements IIdempotentCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly idempotencyKey: string, // From X-Idempotency-Key header
  ) {}
}

// 2. Handler uses @Idempotent decorator
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    // ... other deps
  ) {}

  @Idempotent({ ttlSeconds: 3600 })
  async execute(command: CreateOrderCommand): Promise<string> {
    // This only runs once per idempotencyKey
    // Subsequent calls return cached result
    return await this.createOrder(command);
  }
}

// 3. Client sends idempotency key in header
// POST /orders
// X-Idempotency-Key: order-123-abc
```

### 4.12 Swagger API Documentation ✅ (NEW - Dec 2025)

**File:** `src/main.ts`

**Purpose:** Auto-generated API documentation at `/api/docs`.

**Features:**

- Complete API documentation with Swagger/OpenAPI
- Request/Response schemas
- Authentication support (JWT, API Key)
- Idempotency key header documentation
- Correlation ID header for distributed tracing
- Tag-based organization (products, orders, health)

**Access:** `http://localhost:3000/api/docs`

### 4.13 Integration Tests ✅ (NEW - Dec 2025)

**File:** `src/modules/product/tests/product.integration.spec.ts`

**Purpose:** End-to-end integration tests for Product module.

**Tests Cover:**

- CRUD operations (Create, Read, Update, Delete)
- Stock management (increase/decrease)
- Validation and error handling
- Search and statistics endpoints
- Specification pattern usage
- Duplicate detection (409 Conflict)
- Concurrency handling

**Run Tests:** `npm run test:e2e`

---

## 5. Architecture Compliance Summary

| Aspect                          | Status | Notes                                                                                        |
| :------------------------------ | :----- | :------------------------------------------------------------------------------------------- |
| DDD - Aggregate Root            | ✅     | Product, Order đúng chuẩn: private constructor, factory method, encapsulated state.          |
| DDD - Value Objects             | ✅     | Price, ProductId, Money, OrderId, OrderStatus immutable, equality by value.                  |
| DDD - Domain Events             | ✅     | Events type-safe, immutable, có metadata cho distributed tracing.                            |
| DDD - Domain Services           | ✅     | BulkStockAdjustmentService, ProductUniquenessService, OrderValidationService.                |
| DDD - Repository                | ✅     | Interface ở Domain, Implementation ở Infrastructure với Outbox Pattern support.              |
| CQRS - Command/Query Separation | ✅     | Commands modify state, Queries read-only. Cả Product và Order modules.                       |
| CQRS - Event-Driven             | ✅     | Events published qua EventBus/Outbox, Projections handle events.                             |
| CQRS - Read Side                | ✅     | ProductReadDao, OrderReadDao với caching và cache invalidation.                              |
| Hexagonal - Ports & Adapters    | ✅     | Interfaces (Ports) ở Domain/Application, Implementations (Adapters) ở Infrastructure.        |
| Infrastructure - Persistence    | ✅     | OCC, Soft Delete, Mapper pattern, Outbox Pattern, Raw SQL queries.                           |
| Infrastructure - Read Side      | ✅     | DAO với caching layer, Projection cho event handling, Cache invalidation.                    |
| Infrastructure - Observability  | ✅     | Request Context với correlationId trong events, structured logging, CorrelationIdMiddleware. |
| Exception Handling              | ✅     | ConflictException, BusinessRuleException, NotFoundException, ConcurrencyException.           |
| Cross-Aggregate Transaction     | ✅     | IUnitOfWork pattern demo với PlaceOrderHandler, CancelOrderHandler (Saga compensation).      |

---

## 6. Files Created/Modified

### New Files (Order Module Completion)

- `src/modules/order/domain/services/order-validation.service.ts` - BusinessRuleException demo
- `src/modules/order/domain/services/index.ts`
- `src/modules/order/application/commands/cancel-order.command.ts`
- `src/modules/order/application/commands/handlers/cancel-order.handler.ts` - Saga compensation demo
- `src/modules/order/application/queries/ports/order-read-dao.interface.ts`
- `src/modules/order/application/queries/ports/index.ts`
- `src/modules/order/application/queries/get-order.query.ts`
- `src/modules/order/application/queries/get-order-list.query.ts`
- `src/modules/order/application/queries/handlers/get-order.handler.ts`
- `src/modules/order/application/queries/handlers/get-order-list.handler.ts`
- `src/modules/order/application/queries/handlers/index.ts`
- `src/modules/order/application/queries/index.ts`
- `src/modules/order/application/dtos/cancel-order.dto.ts`
- `src/modules/order/infrastructure/persistence/read/order-read-dao.ts`
- `src/modules/order/infrastructure/persistence/read/index.ts`
- `src/modules/order/infrastructure/projections/order-read-model.projection.ts`
- `src/modules/order/infrastructure/projections/index.ts`

### Modified Files

- `src/modules/product/domain/repositories/product.repository.interface.ts` - Added search criteria, statistics interfaces
- `src/modules/product/infrastructure/persistence/write/product.repository.ts` - Added Raw SQL methods
- `src/modules/order/application/commands/index.ts` - Export CancelOrderCommand
- `src/modules/order/application/commands/handlers/index.ts` - Export CancelOrderHandler
- `src/modules/order/application/dtos/index.ts` - Export CancelOrderDto
- `src/modules/order/application/index.ts` - Export queries
- `src/modules/order/infrastructure/persistence/index.ts` - Export read
- `src/modules/order/infrastructure/index.ts` - Export projections
- `src/modules/order/infrastructure/http/order.controller.ts` - Added cancel, query endpoints
- `src/modules/order/domain/index.ts` - Export services
- `src/modules/order/order.module.ts` - Register all new providers

---

## 7. Quick Reference - API Endpoints

### Product Module

| Method | Endpoint                        | Handler                       | Description                           |
| :----- | :------------------------------ | :---------------------------- | :------------------------------------ |
| POST   | `/products`                     | CreateProductHandler          | Create new product                    |
| GET    | `/products`                     | GetProductListHandler         | List products with pagination         |
| GET    | `/products/:id`                 | GetProductHandler             | Get product by ID                     |
| PUT    | `/products/:id`                 | UpdateProductHandler          | Update product                        |
| DELETE | `/products/:id`                 | DeleteProductHandler          | Soft delete product                   |
| POST   | `/products/:id/stock/increase`  | IncreaseStockHandler          | Increase product stock                |
| POST   | `/products/:id/stock/decrease`  | DecreaseStockHandler          | Decrease product stock                |
| POST   | `/products/stock/bulk-adjust`   | BulkStockAdjustmentHandler    | Bulk stock adjustment                 |
| POST   | `/products/search`              | ProductReadDao.search()       | **NEW**: Advanced search with filters |
| GET    | `/products/stats/summary`       | ProductReadDao.getStats()     | **NEW**: Product statistics           |
| GET    | `/products/inventory/low-stock` | ProductReadDao.findLowStock() | **NEW**: Low stock products           |

### Order Module

| Method | Endpoint      | Handler             | Description                       |
| :----- | :------------ | :------------------ | :-------------------------------- |
| POST   | `/orders`     | PlaceOrderHandler   | Place new order (UnitOfWork demo) |
| GET    | `/orders`     | GetOrderListHandler | List orders with filters          |
| GET    | `/orders/:id` | GetOrderHandler     | Get order by ID                   |
| DELETE | `/orders/:id` | CancelOrderHandler  | Cancel order (Saga compensation)  |

### Health & Docs

| Method | Endpoint        | Description                    |
| :----- | :-------------- | :----------------------------- |
| GET    | `/health`       | Health check                   |
| GET    | `/health/live`  | Liveness probe                 |
| GET    | `/health/ready` | Readiness probe                |
| GET    | `/api/docs`     | **NEW**: Swagger documentation |

---

## 8. New Files Created (Dec 2025 Update)

### Core Layer Additions

- `src/libs/core/domain/specifications/specification.interface.ts` - Specification Pattern base
- `src/libs/core/domain/specifications/index.ts`
- `src/libs/core/application/commands/interfaces/idempotent-command.interface.ts` - Idempotency interfaces

### Shared Layer Additions

- `src/libs/shared/cqrs/idempotency/idempotency.service.ts` - Idempotency service
- `src/libs/shared/cqrs/idempotency/idempotent.decorator.ts` - @Idempotent decorator
- `src/libs/shared/cqrs/idempotency/index.ts`

### Product Module Additions

- `src/modules/product/domain/specifications/product.specifications.ts` - 12 Product specifications
- `src/modules/product/domain/specifications/index.ts`
- `src/modules/product/tests/product.integration.spec.ts` - Integration tests

### Modified Files

- `src/main.ts` - Added Swagger documentation setup
- `src/libs/core/domain/index.ts` - Export specifications
- `src/libs/core/application/commands/index.ts` - Export idempotency interfaces
- `src/libs/shared/cqrs/index.ts` - Export idempotency module
- `src/libs/shared/cqrs/cqrs.module.ts` - Register IdempotencyService
- `src/modules/product/domain/index.ts` - Export specifications
- `src/modules/product/infrastructure/http/product.controller.ts` - Added search/stats endpoints with Swagger docs

---

_Last Updated: Dec 18, 2025_
_Version: 3.0 - Enhanced with Specification Pattern, Idempotency, Swagger, Integration Tests_
