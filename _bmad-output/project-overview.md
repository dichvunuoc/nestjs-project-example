# Project Overview

## Project Information

**Project Name:** nestjs-project-example  
**Type:** Backend API Template/Base  
**Purpose:** NestJS project template with optimal architecture for developing new projects  
**Version:** 0.0.1  
**Architecture:** Modular Monolith with DDD + CQRS + Clean Architecture

## Executive Summary

This is a **production-ready NestJS project template** designed to provide a solid foundation for building enterprise applications. It implements best practices from Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS), and Clean Architecture.

### Key Features

- ✅ **DDD/CQRS Architecture:** Complete implementation of Domain-Driven Design and CQRS patterns
- ✅ **Clean Architecture:** Clear separation of concerns with domain, application, and infrastructure layers
- ✅ **Type Safety:** Full TypeScript support with strict type checking
- ✅ **Database:** PostgreSQL with Drizzle ORM (type-safe SQL)
- ✅ **Caching:** Redis and in-memory caching support
- ✅ **Health Checks:** Built-in health check endpoints for monitoring
- ✅ **CQRS Buses:** Command, Query, and Event buses for CQRS pattern
- ✅ **Repository Pattern:** Base repositories with optimistic concurrency control
- ✅ **Domain Events:** Automatic domain event publishing
- ✅ **Read/Write Separation:** Support for database read replicas

### Architecture Type

**Modular Monolith** - Single codebase with clear module boundaries, following DDD bounded contexts.

### Primary Technology Stack

| Category    | Technology          |
| ----------- | ------------------- |
| Runtime     | Node.js (via Bun)   |
| Language    | TypeScript 5.7.3    |
| Framework   | NestJS 11.0.1       |
| HTTP Server | Fastify 5.1.0       |
| Database    | PostgreSQL          |
| ORM         | Drizzle ORM 0.36.0  |
| Caching     | Redis 5.10.0        |
| CQRS        | @nestjs/cqrs 11.0.3 |

## Project Structure

### Repository Type

**Monolith** - Single cohesive codebase with one part.

### Parts

1. **Main Backend** (Backend API)
   - Type: Backend
   - Root: Project root
   - Tech Stack: NestJS + TypeScript + PostgreSQL + Redis

## Quick Reference

### Tech Stack Summary

- **Framework:** NestJS 11.0.1
- **Language:** TypeScript 5.7.3
- **Database:** PostgreSQL with Drizzle ORM
- **Caching:** Redis + Memory cache
- **HTTP Server:** Fastify
- **Architecture Pattern:** DDD + CQRS + Clean Architecture

### Entry Point

- **Application:** `src/main.ts`
- **Root Module:** `src/app.module.ts`
- **Core Module:** `libs/core/core.module.ts`

### Architecture Pattern

**Domain-Driven Design (DDD) + CQRS + Clean Architecture**

- **Domain Layer:** Pure business logic (no framework dependencies)
- **Application Layer:** Use cases and application services (pure TypeScript)
- **Infrastructure Layer:** Technical implementations (can depend on NestJS)

## Core Components

### ✅ Implemented

1. **Exception Handling**
   - BaseException, DomainException, ValidationException, ConcurrencyException

2. **CQRS Pattern**
   - Command Bus, Query Bus, Event Bus
   - Command/Query/Event Handlers
   - Projections

3. **Caching**
   - Redis Cache Service
   - Memory Cache Service
   - Cache Decorator and Interceptor

4. **Domain Entities**
   - BaseEntity, AggregateRoot
   - Value Objects
   - Domain Events

5. **Repository Pattern**
   - BaseRepository, AggregateRepository
   - Read DAO (BaseReadDao)
   - Repository Interfaces

6. **Database**
   - Drizzle ORM integration
   - Read/Write separation
   - Connection pooling

7. **Health Checks**
   - Health Check Module
   - Database and Redis indicators
   - Liveness/Readiness probes

### 🔴 Planned (See MISSING_COMPONENTS.md)

- Global Exception Filter
- Response DTOs & Interceptors
- Pagination DTOs
- JWT Authentication & Guards
- Logging Service
- Request ID/Correlation ID
- Validation Pipes
- Rate Limiting
- File Upload
- Swagger Configuration
- And more...

## Example Module

### Product Module

A complete example module demonstrating:

- Domain entity (Product Aggregate Root)
- Value objects (Price, ProductId)
- Domain events (ProductCreated, ProductUpdated, ProductDeleted)
- Commands and queries
- Repository implementation
- Read DAO
- HTTP controller
- Complex business logic (bulk stock adjustment)

## Getting Started

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

## Documentation

- **[Architecture Documentation](./architecture.md)** - Detailed architecture overview
- **[API Contracts](./api-contracts.md)** - All API endpoints
- **[Data Models](./data-models.md)** - Database schema and models
- **[Source Tree Analysis](./source-tree-analysis.md)** - Project structure
- **[Development Guide](./development-guide.md)** - Development instructions
- **[Technology Stack](./technology-stack.md)** - Complete tech stack details

## Links to Detailed Documentation

### Generated Documentation

- [Architecture](./architecture.md) - Architecture documentation
- [API Contracts](./api-contracts.md) - API endpoints documentation
- [Data Models](./data-models.md) - Database schema documentation
- [Source Tree Analysis](./source-tree-analysis.md) - Project structure
- [Development Guide](./development-guide.md) - Development instructions
- [Technology Stack](./technology-stack.md) - Technology stack details

### Existing Documentation

- [README.md](../README.md) - Project README
- [README-ARCHITECTURE.md](../README-ARCHITECTURE.md) - Architecture overview
- [Database README](../src/database/README.md) - Database module documentation
- [Product Module README](../src/modules/product/README.md) - Product module example
- [Health Check README](../libs/core/common/health/README.md) - Health check documentation
- [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) - Planned features

## Next Steps

1. Review the [Architecture Documentation](./architecture.md) to understand the design
2. Check [API Contracts](./api-contracts.md) to see available endpoints
3. Read [Development Guide](./development-guide.md) to start developing
4. Review [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) for planned features
5. Use Product Module as a reference for creating new modules

## Project Goals

This template aims to provide:

1. **Best Practices:** Industry-standard patterns and practices
2. **Type Safety:** Full TypeScript support with strict typing
3. **Scalability:** Architecture that scales with your project
4. **Maintainability:** Clear structure and separation of concerns
5. **Testability:** Easy to test with clear boundaries
6. **Reusability:** Core library can be reused across projects

## Support

For questions or issues:

- Review existing documentation
- Check [Missing Components](../libs/core/common/MISSING_COMPONENTS.md) for planned features
- Review example code in Product Module
