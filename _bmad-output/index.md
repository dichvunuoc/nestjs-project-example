# Project Documentation Index

## Project Overview

**Project Name:** nestjs-project-example  
**Type:** Backend API Template/Base  
**Purpose:** NestJS project template with optimal architecture for developing new projects  
**Architecture:** Modular Monolith with DDD + CQRS + Clean Architecture

### Quick Reference

- **Type:** Monolith with 1 part
- **Primary Language:** TypeScript 5.7.3
- **Framework:** NestJS 11.0.1
- **Architecture Pattern:** DDD + CQRS + Clean Architecture
- **Database:** PostgreSQL with Drizzle ORM
- **Caching:** Redis + Memory cache

## Generated Documentation

### Core Documentation

- [Project Overview](./project-overview.md) - Executive summary and project information
- [Architecture](./architecture.md) - Detailed architecture documentation
- [Technology Stack](./technology-stack.md) - Complete technology stack analysis
- [Source Tree Analysis](./source-tree-analysis.md) - Project structure and directory tree
- [Development Guide](./development-guide.md) - Development instructions and workflows

### API Documentation

- [API Contracts](./api-contracts.md) - All API endpoints with request/response examples

### Data Documentation

- [Data Models](./data-models.md) - Database schema and data models

## Existing Documentation

### Root Documentation

- [README.md](../README.md) - Project README
- [README-ARCHITECTURE.md](../README-ARCHITECTURE.md) - Architecture overview

### Module Documentation

- [Database Module README](../src/database/README.md) - Database module documentation
- [Product Module README](../src/modules/product/README.md) - Product module example
- [Health Check README](../libs/core/common/health/README.md) - Health check documentation
- [Bulk Stock Adjustment Explanation](../src/modules/product/BULK_STOCK_ADJUSTMENT_EXPLANATION.md) - Complex business logic example

### Planning Documentation

- [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) - Planned features and components

## Getting Started

### Quick Start

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Setup database:**

   ```bash
   createdb nestjs_project
   bun run db:generate
   bun run db:migrate
   ```

3. **Start development server:**

   ```bash
   bun run start:dev
   ```

4. **Access API:**
   - Base URL: `http://localhost:3000`
   - Health Check: `http://localhost:3000/health`
   - Products API: `http://localhost:3000/products`

### Next Steps

1. Review [Architecture Documentation](./architecture.md) to understand the design
2. Check [API Contracts](./api-contracts.md) to see available endpoints
3. Read [Development Guide](./development-guide.md) to start developing
4. Review [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) for planned features
5. Use Product Module as a reference for creating new modules

## API Endpoints

### Product Module

- `POST /products` - Create product
- `GET /products/:id` - Get product by ID
- `GET /products` - Get product list (with pagination and filters)
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/:id/stock/increase` - Increase stock
- `POST /products/:id/stock/decrease` - Decrease stock
- `POST /products/stock/bulk-adjust` - Bulk stock adjustment

### Health Check Module

- `GET /health` - Overall health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

See [API Contracts](./api-contracts.md) for detailed documentation.

## Data Models

### Product

- **Table:** `products`
- **Entity:** `Product` (Aggregate Root)
- **Schema:** See [Data Models](./data-models.md)

## Project Structure

### Core Library (`libs/core/`)

Reusable DDD/CQRS infrastructure:

- Domain layer (entities, value objects, events)
- Application layer (commands, queries, projections)
- Infrastructure layer (repositories, buses, caching)
- Common (exceptions, health checks)

### Application (`src/`)

- `main.ts` - Application entry point
- `app.module.ts` - Root module
- `database/` - Database configuration
- `modules/` - Feature modules (bounded contexts)

### Feature Modules

Each module follows DDD/CQRS structure:

- `domain/` - Domain layer
- `application/` - Application layer
- `infrastructure/` - Infrastructure layer

See [Source Tree Analysis](./source-tree-analysis.md) for detailed structure.

## Technology Stack

### Core Technologies

- **Runtime:** Node.js (via Bun 1.1.0)
- **Language:** TypeScript 5.7.3
- **Framework:** NestJS 11.0.1
- **HTTP Server:** Fastify 5.1.0
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM 0.36.0
- **Caching:** Redis 5.10.0
- **CQRS:** @nestjs/cqrs 11.0.3

See [Technology Stack](./technology-stack.md) for complete details.

## Architecture

### Pattern

**Domain-Driven Design (DDD) + CQRS + Clean Architecture**

### Layers

1. **Domain Layer** - Pure business logic (no framework dependencies)
2. **Application Layer** - Use cases and application services (pure TypeScript)
3. **Infrastructure Layer** - Technical implementations (can depend on NestJS)

### Key Principles

- Separation of concerns
- Dependency inversion
- Interface-based design
- Event-driven architecture
- CQRS pattern

See [Architecture Documentation](./architecture.md) for detailed information.

## Development

### Common Tasks

- Creating new modules
- Adding API endpoints
- Database migrations
- Testing
- Debugging

See [Development Guide](./development-guide.md) for detailed instructions.

## Planned Features

See [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) for planned features:

### Priority 1 (Critical)

- Global Exception Filter
- Response DTOs & Interceptors
- Pagination DTOs
- Additional Exception Types

### Priority 2 (Important)

- JWT Authentication & Guards
- Logging Service
- Request ID/Correlation ID
- Validation Pipes

### Priority 3 (Nice to have)

- Rate Limiting
- File Upload
- Swagger Configuration
- Configuration Management
- Metrics

## Notes

- This is a **project template/base** for developing new projects
- The architecture is designed to be **optimal** and follow best practices
- Core library (`libs/core/`) is reusable across multiple projects
- Each feature module follows the same structure for consistency
- The architecture supports future migration to microservices if needed

---

**Last Updated:** 2025-12-17  
**Scan Level:** Exhaustive  
**Mode:** Initial Scan
