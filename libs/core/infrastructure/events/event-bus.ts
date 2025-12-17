import { Injectable, Logger } from '@nestjs/common';
import { EventBus as CqrsEventBus } from '@nestjs/cqrs';
import { IDomainEvent } from '../../domain/events';
import { IEventBus } from './interfaces/event-bus.interface';

/**
 * Event Bus implementation (Infrastructure Layer)
 * Wraps @nestjs/cqrs EventBus để implement IEventBus interface
 * và cung cấp subscribe method không có trong @nestjs/cqrs EventBus
 *
 * Infrastructure layer CAN depend on framework - this is correct architecture
 *
 * IMPORTANT: This connects Write Side với Read Side:
 * - When aggregate is saved, domain events are published via this bus
 * - Projections subscribe to events và update Read Model
 *
 * Note: @nestjs/cqrs EventBus uses EventPublisher pattern internally.
 * This wrapper ensures compatibility với our IEventBus interface.
 */
@Injectable()
export class EventBus implements IEventBus {
  private readonly logger = new Logger(EventBus.name);
  private customHandlers: Map<string, Array<(event: IDomainEvent) => Promise<void>>> = new Map();

  constructor(private readonly cqrsEventBus: CqrsEventBus) {}

  /**
   * Publish domain event
   * Publishes to both @nestjs/cqrs EventBus và custom handlers
   *
   * @param event Domain event to publish
   */
  async publish(event: IDomainEvent): Promise<void> {
    // Publish to @nestjs/cqrs EventBus (for EventHandlers decorated với @EventsHandler)
    // Note: @nestjs/cqrs EventBus.publish() expects IEvent, but IDomainEvent is compatible
    this.cqrsEventBus.publish(event as any);

    // Publish to custom handlers (for manual subscriptions)
    const handlers = this.customHandlers.get(event.eventType) || [];
    if (handlers.length > 0) {
      this.logger.debug(`Publishing event ${event.eventType} to ${handlers.length} custom handler(s)`);
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler(event);
          } catch (error) {
            this.logger.error(`Error handling event ${event.eventType}:`, error);
            // Continue với other handlers even if one fails
          }
        }),
      );
    }
  }

  /**
   * Subscribe to domain events
   * Allows manual subscription (not available in @nestjs/cqrs EventBus)
   *
   * For automatic handler registration, use @EventsHandler decorator từ @nestjs/cqrs
   *
   * @param eventType Event type to subscribe to
   * @param handler Handler function
   */
  subscribe<T extends IDomainEvent>(eventType: string, handler: (event: T) => Promise<void>): void {
    if (!this.customHandlers.has(eventType)) {
      this.customHandlers.set(eventType, []);
    }
    this.customHandlers.get(eventType)!.push(handler as (event: IDomainEvent) => Promise<void>);
    this.logger.debug(`Subscribed custom handler to event type: ${eventType}`);
  }
}
