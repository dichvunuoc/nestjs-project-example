---
project_name: 'nestjs-project-example'
user_name: 'Dannv'
date: '2025-12-17T15:50:28.000Z'
sections_completed:
  [
    'technology_stack',
    'architecture_patterns',
    'naming_conventions',
    'code_organization',
    'critical_rules',
    'language_specific_rules',
    'framework_specific_rules',
    'critical_dont_miss_rules',
    'testing_patterns',
    'code_formatting',
    'development_workflow',
    'usage_guidelines',
  ]
status: 'complete'
optimized_for_llm: true
rule_count: 100+
section_count: 13
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Core Framework:**

- NestJS: `^11.0.1`
- TypeScript: `^5.7.3`
- HTTP Server: Fastify `^5.1.0` (NOT Express)
- Package Manager: Bun `1.1.0`

**Database & ORM:**

- PostgreSQL (via `pg` `^8.13.1`)
- Drizzle ORM: `^0.36.0` (type-safe SQL, NOT TypeORM or Prisma)
- Drizzle Kit: `^0.30.0` (migrations)

**CQRS & Events:**

- @nestjs/cqrs: `^11.0.3`

**Caching:**

- Redis: `^5.10.0`

**TypeScript Configuration:**

- Module: `nodenext`
- Module Resolution: `nodenext`
- Target: `ES2023`
- Strict Null Checks: `true`
- Decorators: `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- Path Aliases:
  - `@core/*` → `libs/core/*`
  - `@modules/*` → `src/modules/*`

**Code Quality:**

- ESLint: `^9.18.0` (flat config)
- Prettier: `^3.4.2` (single quotes, trailing commas)
- Jest: `^30.0.0` (test environment: node)

---

## Architecture Patterns

### Primary Pattern: DDD + CQRS + Clean Architecture

This project follows a **Modular Monolith** architecture with three distinct layers:

1. **Domain Layer** (`domain/`) - Pure business logic, NO framework dependencies
2. **Application Layer** (`application/`) - Use cases, pure TypeScript
3. **Infrastructure Layer** (`infrastructure/`) - Technical implementations, CAN depend on NestJS

### Critical Dependency Rules

**Domain Layer:**

- ✅ CAN import: `@core/domain`, `@core/common`
- ❌ CANNOT import: `application`, `infrastructure`, `@nestjs/*`, `drizzle-orm`, `fastify`

**Application Layer:**

- ✅ CAN import: `domain`, `@core/application`
- ❌ CANNOT import: `infrastructure` (except interfaces), `drizzle-orm`, `fastify`, `express`

**Infrastructure Layer:**

- ✅ CAN import: `domain`, `application`, `@core/*`, `@nestjs/*`, `drizzle-orm`, `fastify`

**Core Library (`libs/core/`):**

- ✅ MUST be independent - NEVER import from `src/modules`
- ✅ Reusable across projects
- ✅ Pure TypeScript in Domain & Application layers

### CQRS Pattern Implementation

**Command Side (Write Operations):**

```
HTTP Request → Controller → Command → CommandBus → CommandHandler → Repository → Aggregate
```

- Commands implement `ICommand`
- Handlers implement `ICommandHandler<TCommand, TResult>`
- Use `ICommandBus.execute()` to dispatch commands
- Commands modify aggregates and emit domain events

**Query Side (Read Operations):**

```
HTTP Request → Controller → Query → QueryBus → QueryHandler → ReadDAO → DTO
```

- Queries implement `IQuery<TResult>`
- Handlers implement `IQueryHandler<TQuery, TResult>`
- Use `IQueryBus.execute()` to dispatch queries
- Queries use Read DAOs (optimized for reads, can use read replicas)

**Event Side:**

```
Aggregate → Domain Event → EventBus → EventHandler → Projection/Integration
```

- Domain events implement `IDomainEvent`
- Events are emitted from aggregates
- Event handlers process events asynchronously

---

## Naming Conventions

### File Naming

- **Files:** `kebab-case.ts` (e.g., `product.entity.ts`, `create-product.command.ts`)
- **Test Files:** `*.spec.ts` (e.g., `product.entity.spec.ts`)
- **Module Files:** `{module-name}.module.ts` (e.g., `product.module.ts`)

### Class Naming

- **Entities:** `PascalCase` (e.g., `Product`, `ProductId`)
- **Commands:** `PascalCase` ending with `Command` (e.g., `CreateProductCommand`)
- **Queries:** `PascalCase` starting with `Get` (e.g., `GetProductQuery`)
- **Handlers:** `PascalCase` ending with `Handler` (e.g., `CreateProductHandler`)
- **DTOs:** `PascalCase` ending with `Dto` (e.g., `CreateProductDto`)
- **Controllers:** `PascalCase` ending with `Controller` (e.g., `ProductController`)
- **Repositories:** `PascalCase` ending with `Repository` (e.g., `ProductRepository`)
- **Value Objects:** `PascalCase` (e.g., `Price`, `ProductId`)

### Variable Naming

- **Variables:** `camelCase` (e.g., `productId`, `createProductDto`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_STOCK_QUANTITY`)
- **Private members:** `camelCase` with optional `_` prefix for clarity

### Database Naming

- **Tables:** `snake_case` plural (e.g., `products`, `user_profiles`)
- **Columns:** `snake_case` (e.g., `product_id`, `created_at`)
- **Foreign Keys:** `{table}_id` (e.g., `user_id`, `product_id`)

### API Naming

- **Endpoints:** Plural nouns (e.g., `/products`, `/users`)
- **Route Parameters:** `:id` format (Fastify style)
- **Query Parameters:** `camelCase` (e.g., `page`, `limit`, `sortBy`)

---

## Code Organization

### Module Structure

Each feature module MUST follow this structure:

```
src/modules/{module-name}/
├── domain/
│   ├── entities/              # Aggregate Roots
│   ├── value-objects/         # Value Objects
│   ├── events/                # Domain Events
│   ├── repositories/          # Repository Interfaces (Ports)
│   └── services/              # Domain Services
├── application/
│   ├── commands/
│   │   ├── handlers/         # Command Handlers
│   │   └── index.ts
│   ├── queries/
│   │   ├── handlers/          # Query Handlers
│   │   ├── ports/             # Read DAO Interfaces
│   │   └── index.ts
│   └── dtos/                  # Data Transfer Objects
├── infrastructure/
│   ├── http/                  # Controllers
│   └── persistence/
│       ├── drizzle/
│       │   └── schema/         # Drizzle schemas
│       ├── write/              # Repository implementations
│       └── read/               # Read DAO implementations
└── {module-name}.module.ts    # NestJS Module
```

### Core Library Structure

```
libs/core/
├── domain/                    # Base Domain Classes
├── application/               # CQRS Interfaces
├── infrastructure/            # CQRS Implementations
└── common/                    # Shared Utilities
```

### Import Paths

- Use path aliases: `@core/*` and `@modules/*`
- NEVER use relative paths like `../../../core/`
- Example: `import { AggregateRoot } from '@core/domain';`

---

## Critical Implementation Rules

### 1. Domain Layer Rules

**Aggregate Roots:**

- MUST extend `AggregateRoot` from `@core/domain`
- Contain business logic and validation
- Emit domain events for state changes
- Use value objects for complex types

**Value Objects:**

- MUST extend `BaseValueObject` from `@core/domain`
- Immutable (no setters)
- Equality based on value, not identity

**Domain Events:**

- MUST implement `IDomainEvent` from `@core/domain`
- Named in past tense (e.g., `ProductCreated`, `StockDecreased`)
- Contain all data needed for event handlers

**Repository Interfaces:**

- Defined in `domain/repositories/`
- Return domain entities, NOT DTOs
- Pure TypeScript interfaces (no NestJS decorators)

### 2. Application Layer Rules

**Commands:**

- MUST implement `ICommand` from `@core/application`
- Contain only data needed for the operation
- Validation happens in handlers or domain

**Command Handlers:**

- MUST implement `ICommandHandler<TCommand, TResult>`
- Decorated with `@CommandHandler(CommandClass)`
- Use `ICommandBus.execute()` to dispatch nested commands
- Load aggregates via repository, execute business logic, save

**Queries:**

- MUST implement `IQuery<TResult>` from `@core/application`
- Read-only operations
- Return DTOs, NOT domain entities

**Query Handlers:**

- MUST implement `IQueryHandler<TQuery, TResult>`
- Decorated with `@QueryHandler(QueryClass)`
- Use Read DAOs (NOT repositories) for queries
- Optimized for read performance

**DTOs:**

- Defined in `application/dtos/`
- Used for data transfer between layers
- NO business logic

### 3. Infrastructure Layer Rules

**Controllers:**

- Decorated with `@Controller('resource-name')`
- Use Fastify types: `FastifyRequest`, `FastifyReply`
- Create commands/queries and dispatch via buses
- Return DTOs (will be wrapped by ResponseInterceptor)

**Repositories:**

- Implement repository interfaces from domain
- Extend `AggregateRepository<T>` from `@core/infrastructure`
- Use Drizzle ORM for write operations
- Handle optimistic concurrency control

**Read DAOs:**

- Implement Read DAO interfaces from application layer
- Optimized for read queries
- Can use read replicas
- Return DTOs directly

**Drizzle Schemas:**

- Located in `infrastructure/persistence/drizzle/schema/`
- Use Drizzle ORM schema syntax
- One schema file per aggregate/table

### 4. HTTP Response Format

**Standardized Response:**
All responses are automatically wrapped by `ResponseInterceptor`:

```typescript
{
  success: true,
  statusCode: 200,
  timestamp: "2025-12-17T15:50:28.000Z",
  path: "/products/123",
  method: "GET",
  data: { ... }
}
```

**Paginated Response:**

```typescript
{
  success: true,
  statusCode: 200,
  data: [...],
  meta: {
    page: 1,
    limit: 10,
    total: 50,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false
  }
}
```

**Exception Handling:**

- Use domain exceptions from `@core/common/exceptions`
- Exceptions are caught by `GlobalExceptionFilter`
- Format: `{ message, code, details, statusCode }`

### 5. Database Rules

**Drizzle ORM:**

- Use Drizzle for ALL database operations
- Type-safe queries with full TypeScript support
- Migrations via `drizzle-kit`

**Schema Organization:**

- One schema file per aggregate/table
- Schemas in `infrastructure/persistence/drizzle/schema/`
- Export schemas from `index.ts`

**Read/Write Separation:**

- Write operations: Use repositories (write connection)
- Read operations: Use Read DAOs (can use read replicas)
- Separate connections configured in DatabaseModule

### 6. Caching Rules

**Redis Caching:**

- Use `@Cacheable()` decorator for automatic caching
- Cache keys follow pattern: `{module}:{resource}:{id}`
- Cache invalidation on write operations

**Cache Service:**

- Available via `CacheService` from `@core/infrastructure/caching`
- Supports both Redis and in-memory fallback

### 7. TypeScript Rules

**Strict Mode:**

- `strictNullChecks: true` - Always check for null/undefined
- `noImplicitAny: false` - But avoid `any` when possible
- Use proper types, avoid `any`

**Decorators:**

- Required for NestJS dependency injection
- Use `@Injectable()` for services
- Use `@CommandHandler()` and `@QueryHandler()` for handlers

**Path Aliases:**

- ALWAYS use `@core/*` and `@modules/*`
- Configured in `tsconfig.json`

### 8. Error Handling

**Domain Exceptions:**

- Use `DomainException` for business rule violations
- Use `NotFoundException` for missing resources
- Use `ValidationException` for input validation errors

**Exception Format:**

```typescript
throw new NotFoundException('Product not found', 'PRODUCT_NOT_FOUND', {
  productId: '123',
});
```

**Global Exception Filter:**

- Catches all exceptions
- Converts to standardized HTTP response
- Logs errors appropriately

---

## Language-Specific Rules (TypeScript/JavaScript)

### Async/Await Patterns

**Always use async/await:**

- Prefer `async/await` over Promise chains
- Use `await` for all async operations
- Handle errors with try/catch blocks

**Example:**

```typescript
// ✅ Good
async execute(command: CreateProductCommand): Promise<string> {
  const product = await this.repository.getById(id);
  if (!product) {
    throw new NotFoundException('Product not found');
  }
  await this.repository.save(product);
  return product.id;
}

// ❌ Bad - Promise chains
execute(command: CreateProductCommand): Promise<string> {
  return this.repository.getById(id)
    .then(product => {
      if (!product) throw new NotFoundException('Product not found');
      return this.repository.save(product);
    });
}
```

### Promise.all for Parallel Operations

**Use Promise.all for independent parallel operations:**

- When publishing multiple domain events
- When running multiple health checks
- When fetching unrelated data

**Example:**

```typescript
// ✅ Good - Parallel event publishing
if (events.length > 0) {
  await Promise.all(events.map((event) => this.eventBus.publish(event)));
}

// ❌ Bad - Sequential (slower)
for (const event of events) {
  await this.eventBus.publish(event);
}
```

**Use Promise.allSettled when failures should not stop other operations:**

```typescript
// ✅ Good - Continue even if some checks fail
await Promise.allSettled(checkPromises);
```

### Type Guards and Type Narrowing

**Always use type guards for null checks:**

```typescript
// ✅ Good
const product = await this.repository.getById(id);
if (!product) {
  throw new NotFoundException('Product not found');
}
// TypeScript now knows product is not null
product.increaseStock(quantity);

// ❌ Bad - No type guard
const product = await this.repository.getById(id);
product.increaseStock(quantity); // TypeScript error: possibly null
```

### Generic Constraints

**Use generic constraints for type safety:**

```typescript
// ✅ Good - Constrained generic
export abstract class BaseAggregateRepository<
  TAggregate extends AggregateRoot,
> implements IAggregateRepository<TAggregate> {
  // ...
}

// ❌ Bad - Unconstrained generic
export abstract class BaseAggregateRepository<TAggregate> {
  // No type safety
}
```

### Module Resolution with nodenext

**With `module: "nodenext"`:**

- Use `.js` extension in imports (TypeScript will resolve to `.ts` at compile time)
- Use ES module syntax (`import`/`export`)
- Path aliases work with `@core/*` and `@modules/*`

**Example:**

```typescript
// ✅ Good
import { AggregateRoot } from '@core/domain';
import { Product } from '@modules/product/domain';

// ❌ Bad - Relative paths
import { AggregateRoot } from '../../../core/domain';
```

### Error Handling Patterns

**Always catch and re-throw specific exceptions:**

```typescript
// ✅ Good - Preserve exception type
try {
  await this.persist(aggregate, expectedVersion);
} catch (error) {
  if (error instanceof ConcurrencyException) {
    throw error; // Re-throw to preserve type
  }
  throw error; // Re-throw other errors
}

// ❌ Bad - Loses exception type
try {
  await this.persist(aggregate, expectedVersion);
} catch (error) {
  throw new Error('Save failed'); // Loses original exception type
}
```

---

## Framework-Specific Rules (NestJS)

### Dependency Injection Patterns

**Always use interface-based injection:**

- Use `@Inject()` with interface tokens (Symbols or strings)
- Inject interfaces, not concrete implementations
- Use `useExisting` pattern in module providers

**Example:**

```typescript
// ✅ Good - Interface injection
@Injectable()
export class CreateProductHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}
}

// Module registration
@Module({
  providers: [
    ProductRepository,
    {
      provide: 'IProductRepository',
      useExisting: ProductRepository,
    },
  ],
})
export class ProductModule {}
```

**For Core Module tokens:**

```typescript
// ✅ Good - Use exported tokens
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from '@core/core.module';

@Controller('products')
export class ProductController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}
}
```

### Module Registration

**Module structure:**

- Import `CoreModule` for CQRS buses
- Register handlers in `providers` array
- Use `@Global()` decorator sparingly (only for shared modules)

**Example:**

```typescript
@Module({
  imports: [CoreModule], // Required for CQRS buses
  controllers: [ProductController],
  providers: [
    // Repository implementation
    ProductRepository,
    {
      provide: 'IProductRepository',
      useExisting: ProductRepository,
    },
    // Handlers (auto-registered via decorators)
    CreateProductHandler,
    GetProductHandler,
  ],
  exports: ['IProductRepository'], // Export interface for other modules
})
export class ProductModule {}
```

### Decorator Usage

**Handler Decorators:**

- Use `@CommandHandler(CommandClass)` for command handlers
- Use `@QueryHandler(QueryClass)` for query handlers
- Use `@EventsHandler(EventClass)` for event handlers
- Handlers MUST implement corresponding interface

**Example:**

```typescript
// ✅ Good
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<
  CreateProductCommand,
  string
> {
  async execute(command: CreateProductCommand): Promise<string> {
    // ...
  }
}
```

**Service Decorators:**

- Use `@Injectable()` for all services
- Use `@Inject()` for dependency injection
- Use `@Global()` only for shared modules (CoreModule, DatabaseModule)

### Controller Patterns

**Controller best practices:**

- Use Fastify types: `FastifyRequest`, `FastifyReply`
- Create commands/queries and dispatch via buses
- Return DTOs (will be wrapped by ResponseInterceptor)
- Keep controllers thin - no business logic

**Example:**

```typescript
@Controller('products')
export class ProductController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateProductDto): Promise<string> {
    const command = new CreateProductCommand(
      dto.name,
      dto.description,
      dto.priceAmount,
      dto.priceCurrency,
      dto.stock,
      dto.category,
    );
    return await this.commandBus.execute(command);
  }
}
```

### Database Connection Injection

**Use separate tokens for read/write connections:**

```typescript
// ✅ Good - Write connection in repository
@Injectable()
export class ProductRepository {
  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}
}

// ✅ Good - Read connection in Read DAO
@Injectable()
export class ProductReadDao {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB,
  ) {}
}
```

---

## Critical Don't-Miss Rules

### Concurrency Control

**Optimistic Concurrency Control (OCC):**

- ALL repositories MUST implement OCC using version field
- Check version in UPDATE: `WHERE id = ? AND version = expectedVersion`
- Throw `ConcurrencyException` if version mismatch (affectedRows === 0)
- Increment version atomically: `SET version = version + 1`

**Example:**

```typescript
// ✅ Good - OCC implementation
const result = await db
  .update(productsTable)
  .set(persistenceModel)
  .where(
    and(
      eq(productsTable.id, aggregate.id),
      eq(productsTable.version, expectedVersion), // Critical check
    ),
  );

if (result.length === 0) {
  throw ConcurrencyException.versionMismatch(
    aggregate.id,
    expectedVersion,
    aggregate.version,
  );
}
```

**Version handling:**

- New aggregates: `version = 0`, `expectedVersion = 0` (use INSERT)
- Updated aggregates: `version = N`, `expectedVersion = N - 1` (use UPDATE)
- Domain layer increments version automatically via `markAsUpdated()`

### Domain Event Publishing

**Event publishing order:**

- Events are published AFTER aggregate is persisted
- Events are published in parallel using `Promise.all()`
- Events are cleared AFTER successful publish
- If publish fails, events are lost (consider Transactional Outbox Pattern for production)

**Example:**

```typescript
// ✅ Good - Event publishing flow
async save(aggregate: TAggregate): Promise<TAggregate> {
  // 1. Persist aggregate
  await this.persist(aggregate, expectedVersion);

  // 2. Get events (deep copy)
  const events = aggregate.getDomainEvents();

  // 3. Publish events (parallel)
  if (events.length > 0) {
    await Promise.all(events.map((event) => this.eventBus.publish(event)));
  }

  // 4. Clear events
  aggregate.clearDomainEvents();

  return aggregate;
}
```

**Critical note:**

- Current implementation has risk: If persist succeeds but publish fails, data inconsistency occurs
- For production: Consider implementing Transactional Outbox Pattern
- Store events in database (same transaction as aggregate), then have worker publish them

### Transaction Handling

**Transaction support:**

- Repository `save()` method accepts optional `transaction` parameter
- Use transaction context when provided: `const db = options?.transaction || this.db;`
- For multi-aggregate operations, consider using database transactions

**Example:**

```typescript
// ✅ Good - Transaction support
protected async persist(
  aggregate: Product,
  expectedVersion: number,
  options?: { transaction?: DrizzleTransaction },
): Promise<void> {
  const db = options?.transaction || this.db;
  // Use db (either transaction or default connection)
  await db.insert(productsTable).values(persistenceModel);
}
```

### Event Idempotency

**Event handlers MUST be idempotent:**

- Same event processed multiple times should produce same result
- Use event ID or timestamp to detect duplicates
- Consider using event store for deduplication

**Example:**

```typescript
// ✅ Good - Idempotent event handler
@EventsHandler(ProductCreated)
export class ProductCreatedHandler {
  async handle(event: ProductCreated): Promise<void> {
    // Check if already processed
    const exists = await this.readDao.existsByEventId(event.eventId);
    if (exists) {
      return; // Already processed, skip
    }

    // Process event
    await this.readDao.createProjection(event);

    // Mark as processed
    await this.readDao.markEventProcessed(event.eventId);
  }
}
```

### Read/Write Separation

**Strict separation:**

- Write operations: Use repositories with `DATABASE_WRITE_TOKEN`
- Read operations: Use Read DAOs with `DATABASE_READ_TOKEN`
- NEVER use repository for queries (use Read DAO instead)
- NEVER use Read DAO for writes (use repository instead)

**Example:**

```typescript
// ✅ Good - Write in handler
@CommandHandler(CreateProductCommand)
export class CreateProductHandler {
  constructor(
    @Inject('IProductRepository') private readonly repository: IProductRepository,
  ) {}

  async execute(command: CreateProductCommand): Promise<string> {
    const product = Product.create(...);
    await this.repository.save(product); // Write operation
    return product.id;
  }
}

// ✅ Good - Read in query handler
@QueryHandler(GetProductQuery)
export class GetProductHandler {
  constructor(
    @Inject('IProductReadDao') private readonly readDao: IProductReadDao,
  ) {}

  async execute(query: GetProductQuery): Promise<ProductDto> {
    return await this.readDao.findById(query.id); // Read operation
  }
}
```

### Aggregate Root Rules

**Aggregate boundaries:**

- One aggregate per transaction
- Load entire aggregate (not partial)
- Modify aggregate through methods (not direct property access)
- Emit domain events for state changes

**Example:**

```typescript
// ✅ Good - Modify through method
const product = await this.repository.getById(id);
product.increaseStock(quantity); // Method call, emits event
await this.repository.save(product);

// ❌ Bad - Direct property access
const product = await this.repository.getById(id);
product.stock += quantity; // No event emitted, no validation
await this.repository.save(product);
```

### Value Object Immutability

**Value objects MUST be immutable:**

- No setters
- Create new instance for changes
- Equality based on value, not identity

**Example:**

```typescript
// ✅ Good - Immutable value object
export class Price extends BaseValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super();
  }

  // Create new instance for changes
  add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }
}

// ❌ Bad - Mutable value object
export class Price {
  amount: number; // Can be changed
  currency: string; // Can be changed
}
```

### Error Recovery Patterns

**Handle ConcurrencyException:**

- Retry logic for concurrency conflicts
- Load fresh aggregate and retry operation
- Limit retry attempts to prevent infinite loops

**Example:**

```typescript
// ✅ Good - Retry on concurrency conflict
async execute(command: UpdateProductCommand): Promise<void> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const product = await this.repository.getById(command.id);
      product.update(command.data);
      await this.repository.save(product);
      return;
    } catch (error) {
      if (error instanceof ConcurrencyException && retries < maxRetries - 1) {
        retries++;
        continue; // Retry with fresh aggregate
      }
      throw error; // Re-throw if not concurrency or max retries reached
    }
  }
}
```

---

## Testing Patterns

### Test File Naming

- Unit tests: `*.spec.ts` (co-located with source files)
- E2E tests: `test/jest-e2e.json` configuration
- Test files follow source file naming: `product.entity.spec.ts`

### Test Structure

- Use Jest testing framework
- Test environment: `node`
- Transform: `ts-jest` for TypeScript files

### Test Organization

- Unit tests: Co-located with source files
- Integration tests: In `test/` directory
- E2E tests: Configured via `jest-e2e.json`

### Testing Best Practices

- Mock dependencies in unit tests
- Use real database for integration tests
- Test each layer independently
- Domain layer: Test business logic
- Application layer: Test handlers with mocked repositories
- Infrastructure layer: Test with real database

---

## Code Formatting

### Prettier Configuration

- Single quotes: `true`
- Trailing commas: `all`
- Format on save recommended

### ESLint Configuration

- Flat config format (ESLint 9+)
- Integrated with Prettier
- TypeScript-specific rules enabled

---

## Development Workflow

### Creating a New Feature Module

1. **Design Domain Model**
   - Create entities (extend `AggregateRoot`)
   - Create value objects (extend `BaseValueObject`)
   - Define domain events
   - Create repository interface

2. **Create Application Layer**
   - Define commands and queries
   - Create command/query handlers
   - Create DTOs

3. **Implement Infrastructure**
   - Implement repository (extend `AggregateRepository`)
   - Create Read DAO
   - Create Drizzle schema
   - Create HTTP controller

4. **Register Module**
   - Create NestJS module file
   - Register in `AppModule`

### Running the Application

```bash
# Development
bun run start:dev

# Production build
bun run build
bun run start:prod

# Database migrations
bun run db:generate
bun run db:migrate
```

---

## Important Reminders for AI Agents

1. **NEVER** import infrastructure into domain layer
2. **NEVER** import infrastructure into application layer (except interfaces)
3. **ALWAYS** use path aliases (`@core/*`, `@modules/*`)
4. **ALWAYS** extend base classes from `@core/domain` for entities
5. **ALWAYS** use CQRS pattern - Commands for writes, Queries for reads
6. **ALWAYS** use Fastify types, NOT Express types
7. **ALWAYS** use Drizzle ORM, NOT TypeORM or Prisma
8. **ALWAYS** emit domain events from aggregates
9. **ALWAYS** return DTOs from queries, NOT domain entities
10. **ALWAYS** use standardized response format (handled by interceptor)
11. **ALWAYS** use domain exceptions for business errors
12. **ALWAYS** follow the three-layer architecture strictly
13. **ALWAYS** use Bun package manager commands
14. **NEVER** put business logic in controllers or DTOs
15. **NEVER** access database directly from application layer

---

## Common Mistakes to Avoid

1. ❌ Importing `@nestjs/*` in domain layer
2. ❌ Importing `drizzle-orm` in application layer
3. ❌ Using Express types instead of Fastify types
4. ❌ Returning domain entities from queries
5. ❌ Putting business logic in controllers
6. ❌ Using TypeORM or Prisma instead of Drizzle
7. ❌ Skipping domain events for state changes
8. ❌ Using relative imports instead of path aliases
9. ❌ Creating repositories that return DTOs
10. ❌ Mixing read and write operations in same handler

---

## Usage Guidelines

### For AI Agents

**Before implementing any code:**

- ✅ Read this entire file to understand project context
- ✅ Follow ALL rules exactly as documented
- ✅ When in doubt, prefer the more restrictive option
- ✅ Reference specific sections when implementing features
- ✅ Check dependency rules before importing modules
- ✅ Verify naming conventions match project standards
- ✅ Ensure CQRS pattern is followed correctly

**During implementation:**

- ✅ Use exact technology versions specified
- ✅ Follow architecture layer boundaries strictly
- ✅ Use path aliases (`@core/*`, `@modules/*`) not relative paths
- ✅ Emit domain events for all state changes
- ✅ Implement Optimistic Concurrency Control in repositories
- ✅ Use Fastify types, NOT Express types
- ✅ Use Drizzle ORM, NOT TypeORM or Prisma

**After implementation:**

- ✅ Verify all rules are followed
- ✅ Check for common mistakes listed in this file
- ✅ Ensure tests follow testing patterns
- ✅ Update this file if new patterns emerge

### For Humans

**Maintenance:**

- ✅ Keep this file lean and focused on agent needs
- ✅ Update when technology stack changes
- ✅ Review quarterly for outdated rules
- ✅ Remove rules that become obvious over time
- ✅ Add new critical patterns as they emerge
- ✅ Ensure examples stay current with codebase

**Best practices:**

- Focus on unobvious details agents might miss
- Use specific, actionable language
- Provide code examples for complex patterns
- Keep content optimized for LLM context efficiency
- Maintain consistency with actual codebase

---

_Last Updated: 2025-12-17T15:50:28.000Z_
_Project: nestjs-project-example_
_Status: Complete_
