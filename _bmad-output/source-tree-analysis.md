# Source Tree Analysis

## Project Structure Overview

This NestJS project template follows a **Modular Monolith** architecture with **DDD (Domain-Driven Design)** and **CQRS** patterns. The structure separates concerns into clear layers following Clean Architecture principles.

## Root Directory Structure

```
nestjs-project-example/
├── libs/                          # Shared libraries (reusable across projects)
│   └── core/                      # Core DDD/CQRS library (DDD Kernel)
├── src/                           # Application source code
│   ├── app.module.ts              # Root application module
│   ├── main.ts                    # Application entry point
│   ├── database/                  # Database configuration module
│   └── modules/                   # Feature modules (bounded contexts)
│       └── product/               # Product module (example)
├── _bmad-output/                  # Generated documentation (this folder)
├── .vscode/                       # VS Code settings
├── drizzle.config.ts              # Drizzle ORM configuration
├── nest-cli.json                  # NestJS CLI configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.build.json            # TypeScript build configuration
├── eslint.config.mjs              # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── README.md                      # Project README
└── README-ARCHITECTURE.md         # Architecture documentation
```

## Core Library (`libs/core/`)

The core library provides reusable DDD/CQRS infrastructure that can be used across multiple projects.

### Domain Layer (`libs/core/domain/`)

**Purpose:** Pure business logic, no framework dependencies

```
domain/
├── entities/                      # Base entity classes
│   ├── base.entity.ts            # BaseEntity - common entity properties
│   ├── aggregate-root.ts         # AggregateRoot - DDD aggregate base class
│   ├── interfaces/               # Entity interfaces
│   │   ├── entity.interface.ts
│   │   ├── aggregate-root.interface.ts
│   │   └── soft-deletable.interface.ts
│   └── index.ts
├── value-objects/                 # Value object base class
│   ├── base.value-object.ts      # BaseValueObject - immutable value objects
│   └── index.ts
├── events/                        # Domain event interfaces
│   ├── domain-event.interface.ts
│   └── index.ts
├── services/                      # Domain service base class
│   ├── base.service.ts           # BaseService - for domain services
│   └── index.ts
└── index.ts
```

**Key Components:**

- `BaseEntity`: Provides `id`, `version`, `createdAt`, `updatedAt`
- `AggregateRoot`: Extends BaseEntity, adds domain events support
- `BaseValueObject`: Immutable value objects
- `DomainEvent`: Interface for domain events

### Application Layer (`libs/core/application/`)

**Purpose:** Use cases, application services, CQRS interfaces

```
application/
├── commands/                      # Command pattern
│   ├── interfaces/
│   │   ├── command.interface.ts          # ICommand interface
│   │   ├── command-handler.interface.ts  # ICommandHandler interface
│   │   └── command-bus.interface.ts      # ICommandBus interface
│   └── index.ts
├── queries/                       # Query pattern
│   ├── interfaces/
│   │   ├── query.interface.ts           # IQuery interface
│   │   ├── query-handler.interface.ts    # IQueryHandler interface
│   │   └── query-bus.interface.ts       # IQueryBus interface
│   └── index.ts
├── projections/                   # Projection pattern (for read models)
│   ├── base-projection.ts        # BaseProjection class
│   ├── interfaces/
│   │   └── projection.interface.ts
│   └── index.ts
└── index.ts
```

**Key Components:**

- `ICommandBus`: Interface for executing commands
- `IQueryBus`: Interface for executing queries
- `IEventBus`: Interface for publishing events (in infrastructure)
- `BaseProjection`: Base class for read model projections

### Infrastructure Layer (`libs/core/infrastructure/`)

**Purpose:** Technical implementations (can depend on NestJS)

```
infrastructure/
├── buses/                         # CQRS bus implementations
│   ├── nest-command-bus.ts        # NestJS CommandBus adapter
│   ├── nest-query-bus.ts         # NestJS QueryBus adapter
│   └── index.ts
├── events/                        # Event bus implementation
│   ├── event-bus.ts              # EventBus implementation
│   ├── interfaces/
│   │   └── event-bus.interface.ts
│   └── index.ts
├── caching/                       # Caching infrastructure
│   ├── cache.interface.ts       # ICacheService interface
│   ├── redis-cache.service.ts   # Redis cache implementation
│   ├── memory-cache.service.ts  # Memory cache implementation
│   ├── cache.decorator.ts       # @Cache decorator
│   ├── cache.interceptor.ts     # Cache interceptor
│   └── index.ts
├── persistence/                   # Persistence infrastructure
│   ├── write/                     # Write side (repositories)
│   │   ├── base.repository.ts           # BaseRepository
│   │   ├── aggregate-repository.ts     # AggregateRepository (with events)
│   │   ├── interfaces/
│   │   │   ├── repository.interface.ts
│   │   │   └── aggregate-repository.interface.ts
│   │   └── index.ts
│   └── read/                      # Read side (DAOs)
│       ├── base-read-dao.ts            # BaseReadDao
│       ├── interfaces/
│       │   └── read-dao.interface.ts
│       └── index.ts
└── index.ts
```

**Key Components:**

- `NestCommandBus`: Adapter for @nestjs/cqrs CommandBus
- `NestQueryBus`: Adapter for @nestjs/cqrs QueryBus
- `EventBus`: Domain event bus implementation
- `AggregateRepository`: Repository with automatic event publishing
- `BaseReadDao`: Optimized read operations

### Common (`libs/core/common/`)

**Purpose:** Shared utilities and exceptions

```
common/
├── exceptions/                    # Exception classes
│   ├── base.exception.ts         # BaseException
│   ├── domain.exception.ts       # DomainException
│   ├── validation.exception.ts   # ValidationException
│   ├── concurrency.exception.ts  # ConcurrencyException
│   └── index.ts
├── health/                       # Health check module
│   ├── health.module.ts          # HealthModule
│   ├── health.service.ts         # HealthService
│   ├── health.controller.ts     # Health endpoints
│   ├── health.interface.ts      # Health interfaces
│   ├── health-indicators/        # Health indicators
│   │   ├── database.health-indicator.ts
│   │   ├── redis.health-indicator.ts
│   │   └── index.ts
│   └── index.ts
├── MISSING_COMPONENTS.md         # List of missing components
└── index.ts
```

### Decorators (`libs/core/decorators/`)

**Purpose:** Custom decorators for CQRS

```
decorators/
├── command.decorator.ts          # @Command decorator
├── query.decorator.ts            # @Query decorator
├── events-handler.decorator.ts  # @EventsHandler decorator
└── index.ts
```

### Core Module (`libs/core/core.module.ts`)

**Purpose:** Global NestJS module that provides CQRS buses and core infrastructure

## Application Source (`src/`)

### Entry Point (`src/main.ts`)

**Purpose:** Application bootstrap

- Creates NestJS application with Fastify adapter
- Enables shutdown hooks
- Starts HTTP server on port 3000 (configurable via PORT env var)

### Root Module (`src/app.module.ts`)

**Purpose:** Root application module

- Imports CoreModule (global)
- Imports DatabaseModule
- Imports HealthModule
- Imports feature modules (ProductModule)

### Database Module (`src/database/`)

**Purpose:** Database configuration and connection management

```
database/
├── database.module.ts            # DatabaseModule - provides DB connections
├── database.provider.ts          # Database providers (DATABASE_WRITE, DATABASE_READ)
├── database.service.ts           # DatabaseService (optional utility)
├── database.type.ts              # Database type definitions
├── schema.ts                     # Aggregated schema exports
└── README.md                     # Database module documentation
```

**Key Features:**

- Read/Write connection separation
- Drizzle ORM integration
- Connection pooling
- Health check integration

### Feature Modules (`src/modules/`)

Each feature module follows DDD/CQRS structure with three layers:

#### Product Module (`src/modules/product/`)

**Purpose:** Example feature module demonstrating DDD/CQRS patterns

```
product/
├── domain/                        # Domain Layer (Pure TypeScript)
│   ├── entities/
│   │   ├── product.entity.ts     # Product Aggregate Root
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── price.value-object.ts
│   │   ├── product-id.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── product-created.event.ts
│   │   ├── product-updated.event.ts
│   │   ├── product-deleted.event.ts
│   │   ├── bulk-stock-adjusted.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── product.repository.interface.ts  # IProductRepository (Port)
│   │   └── index.ts
│   ├── services/
│   │   ├── bulk-stock-adjustment.service.ts  # Domain service
│   │   └── index.ts
│   └── index.ts
│
├── application/                   # Application Layer (Use Cases)
│   ├── commands/                  # Write operations
│   │   ├── create-product.command.ts
│   │   ├── update-product.command.ts
│   │   ├── delete-product.command.ts
│   │   ├── increase-stock.command.ts
│   │   ├── decrease-stock.command.ts
│   │   ├── bulk-stock-adjustment.command.ts
│   │   ├── handlers/              # Command handlers
│   │   │   ├── create-product.handler.ts
│   │   │   ├── update-product.handler.ts
│   │   │   ├── delete-product.handler.ts
│   │   │   ├── increase-stock.handler.ts
│   │   │   ├── decrease-stock.handler.ts
│   │   │   ├── bulk-stock-adjustment.handler.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── queries/                   # Read operations
│   │   ├── get-product.query.ts
│   │   ├── get-product-list.query.ts
│   │   ├── handlers/              # Query handlers
│   │   │   ├── get-product.handler.ts
│   │   │   ├── get-product-list.handler.ts
│   │   │   └── index.ts
│   │   ├── ports/                 # Read ports (interfaces)
│   │   │   ├── product-read-dao.interface.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── dtos/                      # Data Transfer Objects
│   │   ├── product.dto.ts
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   ├── bulk-stock-adjustment.dto.ts
│   │   └── index.ts
│   └── index.ts
│
├── infrastructure/                 # Infrastructure Layer (Adapters)
│   ├── persistence/               # Persistence adapters
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       ├── product.schema.ts  # Drizzle schema definition
│   │   │       └── index.ts
│   │   ├── write/
│   │   │   ├── product.repository.ts  # IProductRepository implementation
│   │   │   └── index.ts
│   │   └── read/
│   │       ├── product-read-dao.ts    # IProductReadDao implementation
│   │       └── index.ts
│   ├── http/                       # HTTP adapters (controllers)
│   │   ├── product.controller.ts  # REST API endpoints
│   │   └── index.ts
│   └── index.ts
│
├── product.module.ts              # NestJS module definition
├── README.md                       # Module documentation
└── BULK_STOCK_ADJUSTMENT_EXPLANATION.md  # Complex logic explanation
```

**Dependency Rules:**

- **Domain Layer:** Can only import from `@core/domain` and `@core/common`
- **Application Layer:** Can import from `domain` and `@core/application`
- **Infrastructure Layer:** Can import from `domain`, `application`, `@core/*`, `@nestjs/*`, and `drizzle-orm`

## Configuration Files

### TypeScript (`tsconfig.json`)

**Key Settings:**

- Module: `nodenext`
- Target: `ES2023`
- Path aliases:
  - `@core/*` → `libs/core/*`
  - `@modules/*` → `src/modules/*`

### NestJS (`nest-cli.json`)

**Configuration:**

- Source root: `src`
- Library project: `core` in `libs/core`

### Drizzle (`drizzle.config.ts`)

**Configuration:**

- Schema location: `src/modules/**/infrastructure/persistence/drizzle/schema/*.ts`
- Output: `./drizzle`
- Dialect: PostgreSQL

## Critical Directories

### Core Library (`libs/core/`)

- **Purpose:** Reusable DDD/CQRS infrastructure
- **Dependencies:** Can depend on NestJS (infrastructure layer only)
- **Usage:** Imported by feature modules via `@core/*` aliases

### Feature Modules (`src/modules/*/`)

- **Purpose:** Business features (bounded contexts)
- **Structure:** Domain → Application → Infrastructure layers
- **Pattern:** Each module is self-contained with clear boundaries

### Database (`src/database/`)

- **Purpose:** Database connection and configuration
- **Features:** Read/Write separation, connection pooling

## Entry Points

1. **Application Entry:** `src/main.ts`
2. **Root Module:** `src/app.module.ts`
3. **Core Module:** `libs/core/core.module.ts`
4. **Database Module:** `src/database/database.module.ts`

## Integration Points

- **CQRS Buses:** Provided by CoreModule (global)
- **Database Connections:** Provided by DatabaseModule
- **Health Checks:** Provided by HealthModule
- **Feature Modules:** Import CoreModule and DatabaseModule

## Notes

- All domain and application code is pure TypeScript (no framework dependencies)
- Infrastructure layer can depend on NestJS and external libraries
- Path aliases (`@core/*`, `@modules/*`) simplify imports
- Each feature module follows the same structure for consistency
- Core library is designed to be reusable across multiple projects
