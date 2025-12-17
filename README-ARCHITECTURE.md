# Kiến trúc Modular Monolith - NestJS + DDD + CQRS + Drizzle ORM

## Cấu trúc thư mục

```
root/
├── libs/core/                    # Core Library (DDD Kernel)
│   └── src/
│       ├── domain/               # BaseEntity, AggregateRoot, DomainEvent, ValueObject
│       ├── application/          # ICommand, IQuery, IBus interfaces
│       ├── infrastructure/       # BaseRepository, NestBuses
│       └── common/               # Exceptions
│
└── src/
    ├── core/                     # CoreModule (CQRS Buses)
    ├── database/                 # DatabaseModule (Drizzle)
    └── modules/                  # Feature Modules (Bounded Contexts)
        └── user/                 # User Module Example
            ├── domain/           # Domain Layer (Pure TS)
            ├── application/      # Application Layer (Use Cases)
            └── infrastructure/   # Infrastructure Layer (Adapters)
```

## Dependency Rules

### libs/core
- **KHÔNG** import từ `src/modules`
- Độc lập, có thể tái sử dụng

### Domain Layer (trong module)
- **ĐƯỢC**: `@core/domain`, `@core/common`
- **CẤM**: `application`, `infrastructure`, `@nestjs/*`, `drizzle-orm`

### Application Layer (trong module)
- **ĐƯỢC**: `domain`, `@core/application`
- **CẤM**: `infrastructure` (trừ Interface), `drizzle-orm`, `express`

### Infrastructure Layer (trong module)
- **ĐƯỢC**: `domain`, `application`, `@core/*`, `@nestjs/*`, `drizzle-orm`

## Cách sử dụng

### 1. Tạo Module mới

```bash
# Tạo cấu trúc thư mục
src/modules/your-module/
├── domain/
│   ├── entities/
│   ├── events/
│   └── repositories/
├── application/
│   ├── commands/
│   ├── queries/
│   └── event-handlers/
└── infrastructure/
    ├── http/
    └── persistence/
```

### 2. Sử dụng Core Library

```typescript
// Domain Entity
import { AggregateRoot } from '@core/domain';

export class YourEntity extends AggregateRoot {
  // ...
}

// Repository Interface
import { IAggregateRepository } from '@core/infrastructure';

export interface IYourRepository extends IAggregateRepository<YourEntity> {
  // ...
}

// Command
import { ICommand } from '@core/application';

export class CreateYourCommand implements ICommand {
  // ...
}
```

### 3. Path Mapping

Đã cấu hình trong `tsconfig.json`:
- `@core/*` → `libs/core/*`
- `@modules/*` → `src/modules/*`

## Database Migration

```bash
# Generate migration
bun run drizzle-kit generate

# Run migration
bun run drizzle-kit migrate
```

## Environment Variables

Copy `.env.example` thành `.env` và cấu hình database.

