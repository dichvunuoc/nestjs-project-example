# Development Guide

## Prerequisites

### Required Software

- **Node.js:** Latest LTS version (via Bun runtime)
- **Bun:** 1.1.0+ (package manager and runtime)
- **PostgreSQL:** 12+ (database)
- **Redis:** 6+ (optional, for caching)

### Development Tools

- **VS Code:** Recommended IDE
- **Git:** Version control

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd nestjs-project-example
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nestjs_project

# Optional: Separate Read/Write Connections
# DB_WRITE_HOST=primary-db.example.com
# DB_WRITE_PORT=5432
# DB_WRITE_USER=postgres
# DB_WRITE_PASSWORD=write_password
# DB_WRITE_NAME=nestjs_project

# DB_READ_HOST=replica-db.example.com
# DB_READ_PORT=5432
# DB_READ_USER=postgres
# DB_READ_PASSWORD=read_password
# DB_READ_NAME=nestjs_project

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
PORT=3000
NODE_ENV=development
```

### 4. Database Setup

```bash
# Create database
createdb nestjs_project

# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate
```

## Development Commands

### Start Development Server

```bash
# Start with watch mode (auto-reload on changes)
bun run start:dev

# Start with debug mode
bun run start:debug

# Start production build
bun run start:prod
```

### Build

```bash
# Build for production
bun run build
```

### Testing

```bash
# Run unit tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:cov

# Run E2E tests
bun run test:e2e

# Debug tests
bun run test:debug
```

### Code Quality

```bash
# Lint code
bun run lint

# Format code
bun run format
```

### Database

```bash
# Generate migration from schema changes
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## Project Structure

### Creating a New Feature Module

1. **Create module directory structure:**

```bash
src/modules/your-module/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── repositories/
│   └── services/
├── application/
│   ├── commands/
│   │   └── handlers/
│   ├── queries/
│   │   └── handlers/
│   └── dtos/
└── infrastructure/
    ├── persistence/
    │   ├── drizzle/
    │   │   └── schema/
    │   ├── write/
    │   └── read/
    └── http/
```

2. **Create NestJS module:**

```typescript
// src/modules/your-module/your-module.module.ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@core';
import { DatabaseModule } from '../../database/database.module';
// Import handlers, controllers, etc.

@Module({
  imports: [CoreModule, DatabaseModule],
  providers: [
    // Command handlers
    // Query handlers
    // Repositories
    // Read DAOs
  ],
  controllers: [
    // HTTP controllers
  ],
})
export class YourModule {}
```

3. **Register module in AppModule:**

```typescript
// src/app.module.ts
import { YourModule } from './modules/your-module/your-module.module';

@Module({
  imports: [
    // ... existing modules
    YourModule,
  ],
})
export class AppModule {}
```

### Using Core Library

#### Domain Entity

```typescript
import { AggregateRoot } from '@core/domain';
import { DomainException } from '@core/common';

export class YourEntity extends AggregateRoot {
  // Implementation
}
```

#### Repository Interface

```typescript
import { IAggregateRepository } from '@core/infrastructure';

export interface IYourRepository extends IAggregateRepository<YourEntity> {
  // Custom methods
}
```

#### Command

```typescript
import { ICommand } from '@core/application';

export class CreateYourCommand implements ICommand {
  constructor(
    public readonly name: string,
    // ... other properties
  ) {}
}
```

#### Command Handler

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICommandBus } from '@core';
import { CreateYourCommand } from '../create-your.command';

@CommandHandler(CreateYourCommand)
export class CreateYourHandler implements ICommandHandler<CreateYourCommand> {
  constructor(private readonly repository: IYourRepository) {}

  async execute(command: CreateYourCommand): Promise<string> {
    // Implementation
  }
}
```

## Development Workflow

### 1. Feature Development

1. **Design domain model** (entities, value objects, events)
2. **Define repository interface** (domain layer)
3. **Create commands/queries** (application layer)
4. **Implement handlers** (application layer)
5. **Create DTOs** (application layer)
6. **Implement repository** (infrastructure layer)
7. **Create database schema** (infrastructure layer)
8. **Create HTTP controller** (infrastructure layer)
9. **Write tests**

### 2. Database Changes

1. **Update schema file:**

   ```typescript
   // src/modules/your-module/infrastructure/persistence/drizzle/schema/your.schema.ts
   ```

2. **Generate migration:**

   ```bash
   bun run db:generate
   ```

3. **Review generated migration:**

   ```bash
   # Check drizzle/migrations/ directory
   ```

4. **Run migration:**
   ```bash
   bun run db:migrate
   ```

### 3. Testing

#### Unit Tests

```typescript
// src/modules/your-module/domain/entities/your.entity.spec.ts
import { YourEntity } from './your.entity';

describe('YourEntity', () => {
  it('should create entity', () => {
    // Test
  });
});
```

#### Integration Tests

```typescript
// src/modules/your-module/application/commands/handlers/create-your.handler.spec.ts
import { Test } from '@nestjs/testing';
import { CreateYourHandler } from './create-your.handler';

describe('CreateYourHandler', () => {
  // Test with mocked dependencies
});
```

#### E2E Tests

```typescript
// test/e2e/your-module.e2e-spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('YourModule (e2e)', () => {
  // Test HTTP endpoints
});
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Create/Update DTO:**

   ```typescript
   // src/modules/your-module/application/dtos/your.dto.ts
   ```

2. **Create Command/Query:**

   ```typescript
   // src/modules/your-module/application/commands/create-your.command.ts
   ```

3. **Create Handler:**

   ```typescript
   // src/modules/your-module/application/commands/handlers/create-your.handler.ts
   ```

4. **Add Controller Method:**
   ```typescript
   // src/modules/your-module/infrastructure/http/your.controller.ts
   @Post()
   async create(@Body() dto: CreateYourDto) {
     const command = new CreateYourCommand(dto.name);
     return this.commandBus.execute(command);
   }
   ```

### Adding Caching

```typescript
import { Cache } from '@core/infrastructure';

@Cache({ ttl: 60, key: 'your-key' })
async getYourData(id: string) {
  // Implementation
}
```

### Adding Domain Events

```typescript
// In aggregate
this.addDomainEvent(new YourEvent(this.id, data));

// Event handler
@EventsHandler(YourEvent)
export class YourEventHandler implements IEventHandler<YourEvent> {
  async handle(event: YourEvent) {
    // Handle event
  }
}
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "start:debug"],
      "port": 9229,
      "restart": true,
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Database Debugging

```bash
# Open Drizzle Studio
bun run db:studio

# Connect to database directly
psql -h localhost -U postgres -d nestjs_project
```

## Best Practices

### 1. Dependency Rules

- **Domain Layer:** Pure TypeScript, no framework dependencies
- **Application Layer:** Can depend on domain and @core/application
- **Infrastructure Layer:** Can depend on everything

### 2. Naming Conventions

- **Entities:** PascalCase (e.g., `Product`)
- **Value Objects:** PascalCase (e.g., `Price`)
- **Commands:** PascalCase with "Command" suffix (e.g., `CreateProductCommand`)
- **Queries:** PascalCase with "Query" suffix (e.g., `GetProductQuery`)
- **Handlers:** PascalCase with "Handler" suffix (e.g., `CreateProductHandler`)
- **DTOs:** PascalCase with "Dto" suffix (e.g., `ProductDto`)

### 3. File Organization

- One class per file
- Use `index.ts` for exports
- Group related files in directories

### 4. Error Handling

- Use domain exceptions for business rule violations
- Use validation exceptions for input validation
- Use concurrency exceptions for optimistic locking conflicts

### 5. Testing

- Write unit tests for domain logic
- Write integration tests for handlers
- Write E2E tests for API endpoints
- Aim for >80% code coverage

## Troubleshooting

### Common Issues

#### Database Connection Failed

- Check PostgreSQL is running: `pg_isready`
- Verify connection string in `.env`
- Check database exists: `psql -l`

#### Migration Errors

- Check schema files are correct
- Verify database is up to date
- Review migration files in `drizzle/migrations/`

#### TypeScript Errors

- Run `bun run build` to check for type errors
- Verify path aliases in `tsconfig.json`
- Check imports are correct

#### Module Not Found

- Verify module is registered in `AppModule`
- Check imports in module file
- Verify handlers are in providers array

## Next Steps

- Review [Architecture Documentation](./architecture.md)
- Check [API Contracts](./api-contracts.md)
- See [Data Models](./data-models.md)
- Review [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) for planned features
