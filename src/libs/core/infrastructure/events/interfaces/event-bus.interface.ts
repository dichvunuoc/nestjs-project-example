import { IDomainEvent } from '../../../domain/events';

/**
 * Event Bus interface
 * Provides publish/subscribe pattern for domain events
 */
export interface IEventBus {
  publish(event: IDomainEvent): Promise<void>;
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
  ): void;
}
