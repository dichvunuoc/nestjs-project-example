import { Injectable, Logger } from '@nestjs/common';
import { EventBus as CqrsEventBus } from '@nestjs/cqrs';
import { IDomainEvent } from 'src/libs/core/domain';
import { IEventBus } from 'src/libs/core/infrastructure';

/**
 * Event Bus implementation (Infrastructure Layer)
 * Wraps @nestjs/cqrs EventBus to implement IEventBus interface
 *
 * IMPORTANT: This connects Write Side with Read Side:
 * - When aggregate is saved, domain events are published via this bus
 * - Projections subscribe to events and update Read Model
 */
@Injectable()
export class EventBus implements IEventBus {
  private readonly logger = new Logger(EventBus.name);
  private customHandlers: Map<
    string,
    Array<(event: IDomainEvent) => Promise<void>>
  > = new Map();

  constructor(private readonly cqrsEventBus: CqrsEventBus) {}

  /**
   * Publish domain event
   * Publishes to both @nestjs/cqrs EventBus and custom handlers
   */
  async publish(event: IDomainEvent): Promise<void> {
    // Publish to @nestjs/cqrs EventBus (for EventHandlers decorated with @EventsHandler)
    this.cqrsEventBus.publish(event as any);

    // Publish to custom handlers (for manual subscriptions)
    const handlers = this.customHandlers.get(event.eventType) || [];
    if (handlers.length > 0) {
      this.logger.debug(
        `Publishing event ${event.eventType} to ${handlers.length} custom handler(s)`,
      );
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler(event);
          } catch (error) {
            this.logger.error(
              `Error handling event ${event.eventType}:`,
              error,
            );
          }
        }),
      );
    }
  }

  /**
   * Subscribe to domain events
   * Allows manual subscription (not available in @nestjs/cqrs EventBus)
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
  ): void {
    if (!this.customHandlers.has(eventType)) {
      this.customHandlers.set(eventType, []);
    }
    this.customHandlers
      .get(eventType)!
      .push(handler as (event: IDomainEvent) => Promise<void>);
    this.logger.debug(`Subscribed custom handler to event type: ${eventType}`);
  }
}
