import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NestCommandBus } from './infrastructure/buses/nest-command-bus';
import { NestQueryBus } from './infrastructure/buses/nest-query-bus';
import { EventBus } from './infrastructure/events/event-bus';

// DI Tokens cho interfaces (Ports trong Hexagonal Architecture)
export const COMMAND_BUS_TOKEN = Symbol('ICommandBus');
export const QUERY_BUS_TOKEN = Symbol('IQueryBus');
export const EVENT_BUS_TOKEN = Symbol('IEventBus');
export const UNIT_OF_WORK_TOKEN = Symbol('IUnitOfWork');

/**
 * Core Module - Global Module cho DDD/CQRS Architecture
 *
 * Architecture Layers (Clean Architecture / Hexagonal Architecture):
 *
 * 1. Domain Layer (libs/core/domain)
 *    - Pure business logic, no framework dependencies
 *    - Entities, Value Objects, Domain Events, Domain Services
 *    - Aggregate Roots với domain events
 *
 * 2. Application Layer (libs/core/application)
 *    - Use cases, application services
 *    - Interfaces (Ports): ICommandBus, IQueryBus, IEventBus
 *    - Commands, Queries, Projections
 *    - Pure TypeScript - No framework dependency
 *
 * 3. Infrastructure Layer (libs/core/infrastructure)
 *    - Adapters implementing Application interfaces
 *    - CAN depend on @nestjs/cqrs (framework dependency is OK here)
 *    - NestCommandBus, NestQueryBus, EventBus (Adapters)
 *    - Repositories, Event Bus, Caching, Persistence
 *
 * CQRS Pattern:
 * - Commands: Write operations, mutate state via Aggregate Roots
 * - Queries: Read operations, return DTOs from Read Models
 * - Events: Domain events published by Aggregate Roots, consumed by Projections
 *
 * Handler Registration:
 * Handlers are automatically registered via @nestjs/cqrs decorators:
 * - @CommandHandler(CommandClass) - từ @nestjs/cqrs
 * - @QueryHandler(QueryClass) - từ @nestjs/cqrs
 * - @EventsHandler(EventClass) - từ @nestjs/cqrs
 *
 * Usage in Feature Modules:
 * ```typescript
 * @Module({
 *   imports: [CoreModule], // CoreModule is Global, but explicit import is clearer
 *   providers: [
 *     CreateUserHandler, // Decorated with @CommandHandler(CreateUserCommand)
 *     GetUserHandler,     // Decorated with @QueryHandler(GetUserQuery)
 *   ],
 * })
 * export class UserModule {}
 * ```
 */
@Global() // Global module - available to all modules without explicit import
@Module({
  imports: [CqrsModule], // Required for @nestjs/cqrs decorators to work
  providers: [
    // Infrastructure implementations (Adapters - CAN depend on framework)
    NestCommandBus,
    NestQueryBus,
    EventBus,
    // Provide interfaces using implementation classes (Dependency Inversion Principle)
    // This allows injecting ICommandBus interface instead of concrete NestCommandBus
    {
      provide: COMMAND_BUS_TOKEN,
      useExisting: NestCommandBus,
    },
    {
      provide: QUERY_BUS_TOKEN,
      useExisting: NestQueryBus,
    },
    {
      provide: EVENT_BUS_TOKEN,
      useExisting: EventBus,
    },
  ],
  exports: [
    // Export CqrsModule để các module khác có thể dùng decorators (@CommandHandler, @QueryHandler, @EventsHandler)
    CqrsModule,
    // Export concrete implementations (for direct injection if needed)
    NestCommandBus,
    NestQueryBus,
    EventBus,
    // Export interface tokens (for interface-based injection - recommended)
    COMMAND_BUS_TOKEN,
    QUERY_BUS_TOKEN,
    EVENT_BUS_TOKEN,
  ],
})
export class CoreModule {}
