import { Injectable, Logger } from '@nestjs/common';
import { IDomainEvent } from '../../../domain/events';
import {
  IExternalEventBus,
  SubscriptionOptions,
  EventSerializer,
} from './external-event-bus.interface';

/**
 * Base External Event Bus
 * 
 * Abstract base class cho external event bus implementations
 * Provides common functionality và default implementations
 */
@Injectable()
export abstract class BaseExternalEventBus implements IExternalEventBus {
  protected readonly logger = new Logger(this.constructor.name);
  protected connected: boolean = false;
  protected subscriptions: Map<string, Array<(event: IDomainEvent) => Promise<void>>> = new Map();

  /**
   * Default event serializer (JSON)
   */
  protected serializer: EventSerializer = {
    serialize: (event: IDomainEvent): string => {
      return JSON.stringify({
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        occurredOn: event.occurredOn.toISOString(),
        ...event,
      });
    },
    deserialize: (data: string | Buffer): IDomainEvent => {
      const parsed = JSON.parse(data.toString());
      return {
        ...parsed,
        occurredOn: new Date(parsed.occurredOn),
      } as IDomainEvent;
    },
  };

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;

  abstract publish(event: IDomainEvent, routingKey?: string): Promise<void>;
  abstract publishBatch(events: IDomainEvent[], routingKey?: string): Promise<void>;
  abstract subscribe(
    eventType: string,
    handler: (event: IDomainEvent) => Promise<void>,
    options?: SubscriptionOptions,
  ): Promise<void>;
  abstract unsubscribe(eventType: string): Promise<void>;

  /**
   * Set custom serializer
   */
  setSerializer(serializer: EventSerializer): void {
    this.serializer = serializer;
  }

  /**
   * Get serializer
   */
  getSerializer(): EventSerializer {
    return this.serializer;
  }

  /**
   * Validate event before publishing
   */
  protected validateEvent(event: IDomainEvent): void {
    if (!event.eventType) {
      throw new Error('Event must have eventType');
    }
    if (!event.aggregateId) {
      throw new Error('Event must have aggregateId');
    }
    if (!event.occurredOn) {
      throw new Error('Event must have occurredOn');
    }
  }
}
