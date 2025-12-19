import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NestCommandBus } from './buses/nest-command-bus';
import { NestQueryBus } from './buses/nest-query-bus';
import { EventBus } from './events/event-bus';
import { IdempotencyService } from './idempotency/idempotency.service';

import {
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
  EVENT_BUS_TOKEN,
} from '@core';

export {
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
  EVENT_BUS_TOKEN,
};

/**
 * CQRS Module - Global Module for DDD/CQRS Architecture
 *
 * Provides:
 * - Command Bus for write operations
 * - Query Bus for read operations
 * - Event Bus for domain events
 *
 * Handler Registration:
 * Handlers are automatically registered via @nestjs/cqrs decorators:
 * - @CommandHandler(CommandClass)
 * - @QueryHandler(QueryClass)
 * - @EventsHandler(EventClass)
 *
 * Usage in Feature Modules:
 * ```typescript
 * @Module({
 *   imports: [SharedCqrsModule],
 *   providers: [
 *     CreateUserHandler,
 *     GetUserHandler,
 *   ],
 * })
 * export class UserModule {}
 * ```
 */
@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    // Infrastructure implementations (Adapters)
    NestCommandBus,
    NestQueryBus,
    EventBus,
    // Idempotency support for commands
    IdempotencyService,
    // Provide interfaces using implementation classes (Dependency Inversion)
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
    // Export CqrsModule for decorators
    CqrsModule,
    // Export concrete implementations
    NestCommandBus,
    NestQueryBus,
    EventBus,
    IdempotencyService,
    // Export interface tokens
    COMMAND_BUS_TOKEN,
    QUERY_BUS_TOKEN,
    EVENT_BUS_TOKEN,
  ],
})
export class SharedCqrsModule {}
