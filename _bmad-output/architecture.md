# Architecture Documentation

## Executive Summary

This NestJS project template implements a **Modular Monolith** architecture following **Domain-Driven Design (DDD)**, **Command Query Responsibility Segregation (CQRS)**, and **Clean Architecture** principles. The architecture is designed to be scalable, maintainable, and testable.

## Architecture Pattern

### Primary Pattern: DDD + CQRS + Clean Architecture

The project follows a three-layer architecture:

1. **Domain Layer** - Pure business logic, no framework dependencies
2. **Application Layer** - Use cases and application services, pure TypeScript
3. **Infrastructure Layer** - Technical implementations, can depend on NestJS

### Architectural Style

**Modular Monolith** - Single codebase with clear module boundaries (bounded contexts), allowing for future migration to microservices if needed.

## Technology Stack

### Core Technologies

- **Framework:** NestJS 11.0.1
- **Language:** TypeScript 5.7.3
- **HTTP Server:** Fastify 5.1.0
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM 0.36.0
- **Caching:** Redis 5.10.0
- **CQRS:** @nestjs/cqrs 11.0.3

See [Technology Stack](./technology-stack.md) for complete details.

## Architecture Layers

### 1. Domain Layer (`libs/core/domain` and `src/modules/*/domain`)

**Purpose:** Pure business logic, no framework dependencies

**Components:**

- **Entities:** Business objects with identity (BaseEntity, AggregateRoot)
- **Value Objects:** Immutable objects without identity (BaseValueObject)
- **Domain Events:** Events that represent business occurrences
- **Domain Services:** Services that contain business logic not belonging to a single entity
- **Repository Interfaces:** Contracts for data access (Ports)

**Key Principles:**

- No framework dependencies
- Pure TypeScript
- Business logic only
- Rich domain model

**Example:**

```typescript
// Domain Entity
export class Product extends AggregateRoot {
  // Business logic
  increaseStock(quantity: number): void {
    // Domain validation and logic
  }
}
```

### 2. Application Layer (`libs/core/application` and `src/modules/*/application`)

**Purpose:** Use cases and application services

**Components:**

- **Commands:** Write operations (ICommand, CommandBus)
- **Queries:** Read operations (IQuery, QueryBus)
- **Handlers:** Command and query handlers
- **DTOs:** Data transfer objects
- **Projections:** Read model projections

**Key Principles:**

- Orchestrates domain objects
- No infrastructure dependencies (except interfaces)
- Pure TypeScript
- Thin layer (delegates to domain)

**Example:**

```typescript
// Command Handler
@CommandHandler(CreateProductCommand)
export class CreateProductHandler {
  async execute(command: CreateProductCommand): Promise<string> {
    // Use domain entity
    const product = Product.create(...);
    await this.repository.save(product);
    return product.id;
  }
}
```

### 3. Infrastructure Layer (`libs/core/infrastructure` and `src/modules/*/infrastructure`)

**Purpose:** Technical implementations

**Components:**

- **Repositories:** Database implementations
- **Read DAOs:** Optimized read operations
- **HTTP Controllers:** REST API endpoints
- **Event Bus:** Event publishing implementation
- **Caching:** Redis and memory cache
- **Database:** Drizzle ORM schemas

**Key Principles:**

- Can depend on NestJS and external libraries
- Implements application layer interfaces
- Handles technical concerns
- Adapters (Ports & Adapters pattern)

**Example:**

```typescript
// Repository Implementation
@Injectable()
export class ProductRepository extends AggregateRepository<Product> {
  // Database operations
}
```

## CQRS Pattern

### Command Side (Write)

**Flow:**

1. HTTP Request → Controller
2. Controller → Creates Command → Sends to CommandBus
3. CommandBus → Routes to CommandHandler
4. Handler → Uses Repository → Loads/Creates Aggregate
5. Aggregate → Business Logic → Emits Domain Events
6. Repository → Saves Aggregate → Publishes Events

**Components:**

- Commands (ICommand)
- Command Handlers (ICommandHandler)
- Command Bus (ICommandBus)
- Repositories (IAggregateRepository)

### Query Side (Read)

**Flow:**

1. HTTP Request → Controller
2. Controller → Creates Query → Sends to QueryBus
3. QueryBus → Routes to QueryHandler
4. Handler → Uses Read DAO → Queries Database
5. Read DAO → Returns DTO

**Components:**

- Queries (IQuery)
- Query Handlers (IQueryHandler)
- Query Bus (IQueryBus)
- Read DAOs (IReadDao)

### Benefits

- **Separation of Concerns:** Write and read models can be optimized independently
- **Scalability:** Can scale read and write operations separately
- **Performance:** Read models can be optimized for queries
- **Flexibility:** Can use different databases for read/write

## Data Architecture

### Database

- **Type:** PostgreSQL
- **ORM:** Drizzle ORM (type-safe SQL)
- **Connection:** Read/Write separation support

### Schema Organization

Schemas are organized by module:

```
src/modules/*/infrastructure/persistence/drizzle/schema/*.ts
```

### Read/Write Separation

- **Write Connection:** Used by repositories (source of truth)
- **Read Connection:** Used by read DAOs (can use read replicas)

### CQRS Data Models

- **Write Model:** Aggregate entities (source of truth)
- **Read Model:** DTOs optimized for queries (projections)

## Component Overview

### Core Library (`libs/core/`)

Reusable DDD/CQRS infrastructure:

- **Domain:** BaseEntity, AggregateRoot, Value Objects, Domain Events
- **Application:** Command/Query/Event interfaces, Projections
- **Infrastructure:** Repository implementations, CQRS buses, Caching
- **Common:** Exceptions, Health checks

### Feature Modules (`src/modules/*/`)

Each module follows the same structure:

- **Domain:** Entities, Value Objects, Events, Repository Interfaces
- **Application:** Commands, Queries, Handlers, DTOs
- **Infrastructure:** Repositories, Read DAOs, HTTP Controllers, Database Schemas

### Database Module (`src/database/`)

- Database connection management
- Read/Write separation
- Connection pooling
- Health check integration

## Source Tree

See [Source Tree Analysis](./source-tree-analysis.md) for detailed directory structure.

## Development Workflow

### Creating a New Feature

1. **Design Domain Model**
   - Entities, Value Objects, Events
   - Repository Interface

2. **Create Application Layer**
   - Commands/Queries
   - Handlers
   - DTOs

3. **Implement Infrastructure**
   - Repository
   - Read DAO
   - Database Schema
   - HTTP Controller

4. **Register Module**
   - Create NestJS Module
   - Register in AppModule

See [Development Guide](./development-guide.md) for detailed instructions.

## Deployment Architecture

### Application Server

- **Runtime:** Node.js (via Bun)
- **HTTP Server:** Fastify
- **Port:** 3000 (configurable via PORT env var)

### Database

- **Primary:** PostgreSQL (write operations)
- **Replicas:** Optional read replicas (read operations)

### Caching

- **Primary:** Redis (distributed caching)
- **Fallback:** In-memory cache (local caching)

### Health Checks

- **Liveness:** `/health/live` - Basic health check
- **Readiness:** `/health/ready` - Dependency health check
- **Overall:** `/health` - Detailed health status

## Testing Strategy

### Unit Tests

- Domain entities and value objects
- Domain services
- Application handlers (with mocked dependencies)

### Integration Tests

- Repository implementations
- Read DAOs
- Command/Query handlers with database

### E2E Tests

- HTTP endpoints
- Full request/response cycle
- Database integration

## Security Considerations

### Current Implementation

- Input validation (planned - see MISSING_COMPONENTS.md)
- Exception handling
- Optimistic concurrency control

### Planned Features

- JWT Authentication
- Role-based access control
- Permission-based access control
- Rate limiting
- Request validation

## Performance Considerations

### Caching

- Redis for distributed caching
- Memory cache for local caching
- Cache decorator for easy caching

### Database

- Read/Write separation
- Connection pooling
- Optimized queries in read DAOs

### CQRS

- Separate read and write models
- Optimized read models for queries
- Can scale independently

## Scalability

### Horizontal Scaling

- Stateless application (can run multiple instances)
- Shared database
- Shared Redis cache

### Vertical Scaling

- Read replicas for database
- Connection pooling
- Caching strategies

### Future Microservices Migration

The modular monolith structure allows for future migration to microservices:

- Clear module boundaries (bounded contexts)
- Independent domain models
- Event-driven communication (domain events)

## Dependency Rules

### Domain Layer

- ✅ Can import: `@core/domain`, `@core/common`
- ❌ Cannot import: `application`, `infrastructure`, `@nestjs/*`, `drizzle-orm`

### Application Layer

- ✅ Can import: `domain`, `@core/application`
- ❌ Cannot import: `infrastructure` (except interfaces), `drizzle-orm`, `express`

### Infrastructure Layer

- ✅ Can import: `domain`, `application`, `@core/*`, `@nestjs/*`, `drizzle-orm`

## Best Practices

1. **Domain Logic in Domain Layer:** Business rules belong in entities or domain services
2. **Thin Application Layer:** Application layer orchestrates, doesn't contain business logic
3. **Interface-Based Design:** Application layer depends on interfaces, not implementations
4. **Event-Driven:** Use domain events for cross-aggregate communication
5. **CQRS Separation:** Keep read and write models separate
6. **Type Safety:** Use TypeScript strictly, avoid `any`
7. **Testing:** Write tests for each layer independently

## Notes

- All domain and application code is pure TypeScript (no framework dependencies)
- Infrastructure layer can depend on NestJS and external libraries
- Core library is designed to be reusable across multiple projects
- Each feature module follows the same structure for consistency
- The architecture supports future migration to microservices if needed
