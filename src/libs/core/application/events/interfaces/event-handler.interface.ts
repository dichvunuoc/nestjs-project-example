import type { IDomainEvent } from 'src/libs/core/domain';

/**
 * Event Handler interface (Port)
 *
 * Application layer contract for handling domain events.
 * Implementations can be framework-specific in infrastructure.
 */
export interface IEventHandler<TEvent extends IDomainEvent = IDomainEvent> {
  handle(event: TEvent): Promise<void> | void;
}
